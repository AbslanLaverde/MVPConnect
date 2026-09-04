[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('local', 'test')]
    [string]$Environment,

    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[0-9]{10,}-[0-9a-f]{6}$')]
    [string]$E2eRunId,

    [switch]$Execute,

    [string]$Neo4jHttpUrl = 'http://localhost:7474',
    [string]$Neo4jDatabase = 'neo4j',
    [string]$Neo4jUsername = $(if ($env:NEO4J_USERNAME) { $env:NEO4J_USERNAME } else { 'neo4j' }),
    [string]$Neo4jPassword = $(if ($env:NEO4J_PASSWORD) { $env:NEO4J_PASSWORD } else { 'changeme' }),
    [string]$MinioEndpoint = 'http://localhost:9000',
    [string]$MinioBucket = 'mvpconnect-media',
    [string]$MinioAccessKey = $(if ($env:MINIO_ROOT_USER) { $env:MINIO_ROOT_USER } else { 'minioadmin' }),
    [string]$MinioSecretKey = $(if ($env:MINIO_ROOT_PASSWORD) { $env:MINIO_ROOT_PASSWORD } else { 'minioadmin' })
)

$ErrorActionPreference = 'Stop'

function Assert-LoopbackHttpUri([string]$Value, [string]$Name) {
    $uri = [Uri]$Value
    if (-not $uri.IsAbsoluteUri -or -not $uri.IsLoopback -or $uri.Scheme -notin @('http', 'https')) {
        throw "$Name must be an absolute loopback HTTP(S) URL. Refusing unsafe cleanup target."
    }
}

function Invoke-Neo4jStatement([string]$Statement, [hashtable]$Parameters) {
    $credentialBytes = [Text.Encoding]::UTF8.GetBytes("${Neo4jUsername}:${Neo4jPassword}")
    $headers = @{ Authorization = 'Basic ' + [Convert]::ToBase64String($credentialBytes) }
    $body = @{
        statements = @(@{
            statement = $Statement
            parameters = $Parameters
            resultDataContents = @('row')
        })
    } | ConvertTo-Json -Depth 20
    $endpoint = "$($Neo4jHttpUrl.TrimEnd('/'))/db/$Neo4jDatabase/tx/commit"
    $response = Invoke-RestMethod -Method Post -Uri $endpoint -Headers $headers `
        -ContentType 'application/json' -Body $body
    if ($response.errors.Count -gt 0) {
        $codes = $response.errors | ForEach-Object code
        throw "Neo4j rejected the local cleanup query: $($codes -join ', ')."
    }
    return @($response.results[0].data | ForEach-Object {
        [pscustomobject]@{ Row = $_.row }
    })
}

function Remove-MinIoObject([string]$ObjectKey) {
    $encodedAccessKey = [Uri]::EscapeDataString($MinioAccessKey)
    $encodedSecretKey = [Uri]::EscapeDataString($MinioSecretKey)
    $mcHost = "http://${encodedAccessKey}:${encodedSecretKey}@minio:9000"
    $target = "local/$MinioBucket/$ObjectKey"
    $arguments = @(
        'compose', 'run', '--rm', '-T',
        '-e', "MC_HOST_local=$mcHost",
        '--entrypoint', 'mc', 'minio-init',
        'rm', '--json', $target
    )
    $output = & docker @arguments 2>&1
    if ($LASTEXITCODE -eq 0) {
        return $true
    }
    if (($output -join "`n") -match 'Object does not exist') {
        return $false
    }
    throw 'MinIO cleanup failed. Graph data was not deleted; retry is safe.'
}

Assert-LoopbackHttpUri $Neo4jHttpUrl 'Neo4jHttpUrl'
Assert-LoopbackHttpUri $MinioEndpoint 'MinioEndpoint'
if ($MinioBucket -ne 'mvpconnect-media' -and $MinioBucket -notmatch '^mvpconnect-test-[a-z0-9-]+$') {
    throw 'MinioBucket must be mvpconnect-media or an explicitly test-named bucket.'
}

$escapedRunId = [regex]::Escape($E2eRunId)
$emailPattern = "^e2e-(artist|venue|promoter|resume)-${escapedRunId}@example\.local$"
$allE2ePattern = '^e2e-(artist|venue|promoter|resume)-[0-9]{10,}-[0-9a-f]{6}@example\.local$'
$targetQuery = @'
MATCH (owner)
WHERE any(label IN labels(owner) WHERE label IN ['Musician', 'Venue', 'Promoter'])
  AND owner.email =~ $emailPattern
OPTIONAL MATCH (media:MediaAsset)
WHERE media.ownerId = owner.id
RETURN owner.id,
       owner.email,
       labels(owner),
       collect(DISTINCT {
           id: media.id,
           objectKey: media.objectKey
       })
ORDER BY owner.email
'@
$controlCountQuery = @'
MATCH (owner)
WHERE any(label IN labels(owner) WHERE label IN ['Musician', 'Venue', 'Promoter'])
  AND NOT coalesce(owner.email, '') =~ $allE2ePattern
RETURN count(owner)
'@

$targetRows = Invoke-Neo4jStatement $targetQuery @{ emailPattern = $emailPattern }
$controlCountBefore = (Invoke-Neo4jStatement $controlCountQuery @{
    allE2ePattern = $allE2ePattern
})[0].Row[0]
$ownerIds = @()
$emails = @()
$objectKeys = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
foreach ($row in $targetRows) {
    $values = $row.Row
    $ownerId = [string]$values[0]
    $email = [string]$values[1]
    if ($ownerId -notmatch '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') {
        throw 'Cleanup target owner ID is not a server-generated UUID. Refusing cleanup.'
    }
    if ($email -notmatch $emailPattern) {
        throw 'Cleanup target email failed the exact E2E run check. Refusing cleanup.'
    }
    $ownerIds += $ownerId
    $emails += $email
    foreach ($media in @($values[3])) {
        if ($null -eq $media.id -or $null -eq $media.objectKey) {
            continue
        }
        $expectedKeyPattern = '^users/' + [regex]::Escape($ownerId) + `
            '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
        if ([string]$media.objectKey -notmatch $expectedKeyPattern) {
            throw 'Cleanup target object key failed the owner-scoped media-key check. Refusing cleanup.'
        }
        [void]$objectKeys.Add([string]$media.objectKey)
    }
}

$plan = [ordered]@{
    mode = if ($Execute) { 'execute' } else { 'plan-only' }
    environment = $Environment
    e2eRunId = $E2eRunId
    matchedAccounts = $ownerIds.Count
    matchedMediaObjects = $objectKeys.Count
    emails = $emails
    nonE2eControlAccountsBefore = $controlCountBefore
}
if (-not $Execute) {
    $plan | ConvertTo-Json -Depth 5
    return
}

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$objectsRemoved = 0
$objectsAlreadyAbsent = 0
Push-Location $repositoryRoot
try {
    foreach ($objectKey in $objectKeys) {
        if (Remove-MinIoObject $objectKey) {
            $objectsRemoved++
        } else {
            $objectsAlreadyAbsent++
        }
    }
} finally {
    Pop-Location
}

if ($ownerIds.Count -gt 0) {
    $deleteQuery = @'
MATCH (owner)
WHERE owner.id IN $ownerIds
  AND any(label IN labels(owner) WHERE label IN ['Musician', 'Venue', 'Promoter'])
  AND owner.email =~ $emailPattern
OPTIONAL MATCH (owner)-[:HAS_ONBOARDING_DRAFT]->(draft:OnboardingDraft)
OPTIONAL MATCH (draft)-[:HAS_STEP]->(step:OnboardingStep)
OPTIONAL MATCH (media:MediaAsset)
WHERE media.ownerId = owner.id
WITH collect(DISTINCT owner)
     + collect(DISTINCT draft)
     + collect(DISTINCT step)
     + collect(DISTINCT media) AS nodes
UNWIND nodes AS node
WITH DISTINCT node
WHERE node IS NOT NULL
DETACH DELETE node
'@
    [void](Invoke-Neo4jStatement $deleteQuery @{
        ownerIds = $ownerIds
        emailPattern = $emailPattern
    })
}

$remainingTargets = (Invoke-Neo4jStatement `
    'MATCH (owner) WHERE owner.id IN $ownerIds AND owner.email =~ $emailPattern RETURN count(owner)' `
    @{ ownerIds = $ownerIds; emailPattern = $emailPattern })[0].Row[0]
$controlCountAfter = (Invoke-Neo4jStatement $controlCountQuery @{
    allE2ePattern = $allE2ePattern
})[0].Row[0]
if ($remainingTargets -ne 0) {
    throw 'Target E2E accounts remain after cleanup.'
}
if ($controlCountAfter -ne $controlCountBefore) {
    throw 'Non-E2E control account count changed. Cleanup safety verification failed.'
}

$plan.objectsRemoved = $objectsRemoved
$plan.objectsAlreadyAbsent = $objectsAlreadyAbsent
$plan.remainingTargetAccounts = $remainingTargets
$plan.nonE2eControlAccountsAfter = $controlCountAfter
$plan.controlAccountsUnchanged = $true
$plan | ConvertTo-Json -Depth 5
