import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Linking, Text, TouchableOpacity, View } from 'react-native';
import type { EntityReferenceDto } from '../../onboarding/stepTwoTypes';
import type { OnboardingPersonaConfig } from '../../onboarding/onboardingConfig';
import { FieldFrame } from './FieldFrame';
import { fieldStyles } from './OnboardingFields.styles';
import { TextField } from './TextField';

export const ENTITY_REFERENCE_SEARCH_DEBOUNCE_MS = 300;

export interface ResolvedReferenceEntity {
  id: string;
  name: string;
  imageUrl?: string | null;
  externalUrl?: string | null;
  secondaryText?: string | null;
  imageSourceUrl?: string | null;
  imageAttributions?: ReferenceImageAttribution[];
}

export interface ProviderReferenceEntity {
  providerId: string;
  name: string;
  imageUrl?: string | null;
  externalUrl?: string | null;
  secondaryText?: string | null;
  imageSourceUrl?: string | null;
  imageAttributions?: ReferenceImageAttribution[];
}

export interface ReferenceImageAttribution {
  displayName?: string | null;
  uri?: string | null;
  photoUri?: string | null;
}

export type ReferenceProviderAttemptStatus = 'NO_MATCH' | 'UNAVAILABLE';

export interface EntityReferenceResolverProvider {
  searchLocal(query: string): Promise<ResolvedReferenceEntity[]>;
  searchProvider(query: string): Promise<ProviderReferenceEntity[]>;
  resolveProvider(providerId: string): Promise<ResolvedReferenceEntity>;
  createFreeForm(
    displayName: string,
    attemptStatus: ReferenceProviderAttemptStatus,
  ): Promise<ResolvedReferenceEntity>;
  isUnavailableError(error: unknown): boolean;
}

export interface EntityReferenceResolverLabels {
  entityName: string;
  entityNamePlural: string;
  entityTypeLabel: string;
  localResultLabel: string;
  selectedLabel: string;
  providerName: string;
  providerResultLabel: string;
  providerLinkLabel: string;
  fallbackImageLabel: string;
}

export interface EntityReferenceResolverInputProps<TReference extends EntityReferenceDto> {
  label: string;
  value: readonly TReference[];
  onChange: (value: TReference[]) => void;
  toReference: (entity: ResolvedReferenceEntity) => TReference;
  provider: EntityReferenceResolverProvider;
  labels: EntityReferenceResolverLabels;
  maxSelections?: number;
  optional?: boolean;
  disabled?: boolean;
  helperText?: string;
  error?: string;
  placeholder?: string;
  accentConfig?: OnboardingPersonaConfig;
  showCounter?: boolean;
}

const normalizeDisplayName = (displayName: string): string =>
  displayName.trim().replace(/\s+/g, ' ').toLowerCase();

const referenceIdentity = (reference: EntityReferenceDto): string =>
  reference.entityId
    ? `${reference.entityType}:id:${reference.entityId}`
    : `${reference.entityType}:name:${normalizeDisplayName(reference.displayName)}`;

export function EntityReferenceResolverInput<TReference extends EntityReferenceDto>({
  label,
  value,
  onChange,
  toReference,
  provider,
  labels,
  maxSelections = 5,
  optional = true,
  disabled = false,
  helperText,
  error,
  placeholder,
  accentConfig,
  showCounter = false,
}: EntityReferenceResolverInputProps<TReference>) {
  const [input, setInput] = useState('');
  const [localResults, setLocalResults] = useState<ResolvedReferenceEntity[]>([]);
  const [providerResults, setProviderResults] = useState<ProviderReferenceEntity[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolvingKey, setResolvingKey] = useState<string | null>(null);
  const [providerAttempt, setProviderAttempt] = useState<ReferenceProviderAttemptStatus | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [entityDetails, setEntityDetails] = useState<Record<string, ResolvedReferenceEntity>>({});
  const requestSequence = useRef(0);
  const hydrationAttempts = useRef(new Set<string>());
  const trimmedInput = input.trim().replace(/\s+/g, ' ');
  const lowerEntity = labels.entityName.toLowerCase();
  const upperEntity = labels.entityName.toUpperCase();
  const upperPlural = labels.entityNamePlural.toUpperCase();
  const upperProvider = labels.providerName.toUpperCase();
  const existingIdentities = useMemo(() => new Set(value.map(referenceIdentity)), [value]);
  const duplicate = trimmedInput.length > 0 && value.some(
    (reference) => normalizeDisplayName(reference.displayName) === normalizeDisplayName(trimmedInput),
  );
  const limitReached = value.length >= maxSelections;
  const focusGradientColors = accentConfig?.accentEnd
    ? [accentConfig.accentStart, accentConfig.accentEnd] as const
    : undefined;

  useEffect(() => {
    let active = true;
    const unresolvedDetails = value.filter((reference) => {
      const id = reference.entityId?.trim();
      if (!id || entityDetails[id] || hydrationAttempts.current.has(id)) return false;
      hydrationAttempts.current.add(id);
      return true;
    });
    if (!unresolvedDetails.length) return undefined;

    void Promise.all(unresolvedDetails.map(async (reference) => {
      try {
        const candidates = await provider.searchLocal(reference.displayName);
        return candidates.find((candidate) => candidate.id === reference.entityId);
      } catch {
        return undefined;
      }
    })).then((results) => {
      if (!active) return;
      const hydrated = results.filter(
        (entity): entity is ResolvedReferenceEntity => entity !== undefined,
      );
      if (!hydrated.length) return;
      setEntityDetails((current) => {
        const next = { ...current };
        hydrated.forEach((entity) => {
          next[entity.id] = entity;
        });
        return next;
      });
    });
    return () => {
      active = false;
    };
  }, [entityDetails, provider, value]);

  const resetSearch = useCallback(() => {
    setLocalResults([]);
    setProviderResults([]);
    setProviderAttempt(null);
    setStatusMessage(null);
  }, []);

  const searchExternalProvider = useCallback(async (query: string, sequence: number) => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const results = await provider.searchProvider(query);
      if (requestSequence.current !== sequence) return;
      setProviderResults(results);
      setProviderAttempt('NO_MATCH');
      if (!results.length) setStatusMessage(`NO ${upperProvider} RESULTS FOUND.`);
    } catch (searchError) {
      if (requestSequence.current !== sequence) return;
      setProviderResults([]);
      if (provider.isUnavailableError(searchError)) {
        setProviderAttempt('UNAVAILABLE');
        setStatusMessage(
          `${upperProvider} IS TEMPORARILY UNAVAILABLE. YOU CAN STILL ADD THIS ${upperEntity}.`,
        );
      } else {
        setProviderAttempt(null);
        setStatusMessage(`${upperEntity} SEARCH COULD NOT BE COMPLETED. PLEASE TRY AGAIN.`);
      }
    } finally {
      if (requestSequence.current === sequence) setLoading(false);
    }
  }, [provider, upperEntity, upperProvider]);

  useEffect(() => {
    const sequence = ++requestSequence.current;
    if (trimmedInput.length < 2 || disabled || limitReached) {
      setLoading(false);
      resetSearch();
      return undefined;
    }

    setLoading(true);
    resetSearch();
    const timeout = setTimeout(async () => {
      try {
        const results = await provider.searchLocal(trimmedInput);
        if (requestSequence.current !== sequence) return;
        setLocalResults(results);
        if (!results.length) await searchExternalProvider(trimmedInput, sequence);
        else setLoading(false);
      } catch {
        if (requestSequence.current !== sequence) return;
        setLocalResults([]);
        await searchExternalProvider(trimmedInput, sequence);
      }
    }, ENTITY_REFERENCE_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [disabled, limitReached, provider, resetSearch, searchExternalProvider, trimmedInput]);

  const addResolvedReference = (entity: ResolvedReferenceEntity) => {
    const reference = toReference(entity);
    if (disabled || limitReached || existingIdentities.has(referenceIdentity(reference))) return;
    setEntityDetails((current) => ({ ...current, [entity.id]: entity }));
    onChange([...value, reference]);
    setInput('');
    resetSearch();
  };

  const selectProviderResult = async (entity: ProviderReferenceEntity) => {
    if (disabled || limitReached || resolvingKey) return;
    setResolvingKey(entity.providerId);
    setStatusMessage(null);
    try {
      addResolvedReference(await provider.resolveProvider(entity.providerId));
    } catch {
      setStatusMessage(`THIS ${upperEntity} COULD NOT BE RESOLVED. TRY AGAIN OR ADD MANUALLY.`);
    } finally {
      setResolvingKey(null);
    }
  };

  const addManual = async () => {
    if (!providerAttempt || !trimmedInput || disabled || limitReached || duplicate || resolvingKey) return;
    setResolvingKey('manual');
    setStatusMessage(null);
    try {
      addResolvedReference(await provider.createFreeForm(trimmedInput, providerAttempt));
    } catch {
      setStatusMessage(`THE ${upperEntity} COULD NOT BE ADDED. PLEASE TRY AGAIN.`);
    } finally {
      setResolvingKey(null);
    }
  };

  const removeReference = (index: number) => {
    if (!disabled) onChange(value.filter((_, candidateIndex) => candidateIndex !== index));
  };

  const runExplicitProviderSearch = () => {
    const sequence = ++requestSequence.current;
    setProviderResults([]);
    setProviderAttempt(null);
    void searchExternalProvider(trimmedInput, sequence);
  };

  const openExternalUrl = (url?: string | null) => {
    if (url) void Linking.openURL(url);
  };

  return (
    <FieldFrame
      label={label}
      optional={optional}
      helperText={helperText}
      helperBefore
      error={error}
      headerAccessory={showCounter ? (
        <Text
          testID={`${label}-selection-count`}
          style={fieldStyles.selectionCounter}
          accessibilityLabel={`${value.length} of ${maxSelections} ${labels.entityNamePlural.toLowerCase()} selected`}
        >
          {`${value.length} / ${maxSelections}`}
        </Text>
      ) : undefined}
    >
      <TextField
        value={input}
        onChangeText={setInput}
        onSubmitEditing={providerAttempt ? addManual : undefined}
        placeholder={placeholder ?? `Search for a ${lowerEntity}`}
        returnKeyType="search"
        autoCorrect={false}
        disabled={disabled || limitReached}
        accessibilityLabel={`${label} ${lowerEntity} name`}
        containerStyle={fieldStyles.referenceInput}
        focusColor={accentConfig?.accentStart}
        focusGradientColors={focusGradientColors}
      />

      {loading ? <Text style={fieldStyles.statusText}>SEARCHING...</Text> : null}

      {localResults.length ? (
        <View style={fieldStyles.referenceSearchPanel}>
          <Text style={fieldStyles.referenceResultGroupLabel}>{labels.localResultLabel}</Text>
          {localResults.map((entity) => (
            <ReferenceResultRow
              key={entity.id}
              entity={entity}
              labels={labels}
              onSelect={() => addResolvedReference(entity)}
              onOpenUrl={openExternalUrl}
              disabled={disabled || limitReached}
            />
          ))}
          {!providerAttempt ? (
            <TouchableOpacity
              style={fieldStyles.referenceProviderAction}
              onPress={runExplicitProviderSearch}
              accessibilityRole="button"
              accessibilityLabel={`Search ${labels.providerName}`}
            >
              <Text style={[
                fieldStyles.referenceProviderActionLabel,
                accentConfig && { color: accentConfig.accentEnd ?? accentConfig.accentStart },
              ]}>SEARCH {upperProvider} →</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {providerResults.length ? (
        <View style={fieldStyles.referenceSearchPanel}>
          <Text style={fieldStyles.referenceResultGroupLabel}>{labels.providerResultLabel}</Text>
          {providerResults.map((entity) => (
            <ReferenceResultRow
              key={entity.providerId}
              entity={entity}
              labels={labels}
              onSelect={() => void selectProviderResult(entity)}
              onOpenUrl={openExternalUrl}
              disabled={disabled || limitReached || resolvingKey === entity.providerId}
            />
          ))}
        </View>
      ) : null}

      {statusMessage ? (
        <Text style={fieldStyles.referenceFeedback} accessibilityLiveRegion="polite">
          {statusMessage}
        </Text>
      ) : null}

      {providerAttempt && trimmedInput && !duplicate ? (
        <TouchableOpacity
          style={[fieldStyles.referenceManualAction, accentConfig && { borderColor: accentConfig.accentStart }]}
          onPress={() => void addManual()}
          disabled={disabled || limitReached || Boolean(resolvingKey)}
          accessibilityRole="button"
          accessibilityLabel={`Add ${trimmedInput} manually`}
        >
          <Text style={[
            fieldStyles.referenceProviderActionLabel,
            accentConfig && { color: accentConfig.accentEnd ?? accentConfig.accentStart },
          ]}>
            ADD “{trimmedInput}” MANUALLY →
          </Text>
        </TouchableOpacity>
      ) : null}

      {value.length ? (
        <View style={fieldStyles.referenceList}>
          <Text style={fieldStyles.referenceResultGroupLabel}>{labels.selectedLabel}</Text>
          {value.map((reference, index) => {
            const details = reference.entityId ? entityDetails[reference.entityId] : undefined;
            return (
              <View key={`${referenceIdentity(reference)}:${index}`} style={fieldStyles.referenceEntry}>
                {details?.imageUrl ? (
                  <Image
                    source={{ uri: details.imageUrl }}
                    style={fieldStyles.referenceSelectedImage}
                    accessibilityLabel={`${reference.displayName} selected ${lowerEntity} image`}
                  />
                ) : (
                  <View
                    style={fieldStyles.referenceSelectedImageFallback}
                    accessibilityLabel={`${reference.displayName} selected ${lowerEntity} image unavailable`}
                  >
                    <Text style={fieldStyles.referenceResultImageFallbackLabel}>
                      {labels.fallbackImageLabel}
                    </Text>
                  </View>
                )}
                <View style={fieldStyles.referenceSelectedCopy}>
                  <Text style={fieldStyles.referenceName}>{reference.displayName}</Text>
                  {details?.secondaryText ? (
                    <Text style={fieldStyles.referenceSelectedType}>{details.secondaryText}</Text>
                  ) : null}
                  <Text style={fieldStyles.referenceSelectedType}>{labels.entityTypeLabel}</Text>
                  {details?.imageUrl
                  && (details.imageAttributions?.length || details.imageSourceUrl) ? (
                    <ReferenceImageAttributions
                      attributions={details.imageAttributions}
                      sourceUrl={details.imageSourceUrl}
                      onOpenUrl={openExternalUrl}
                    />
                  ) : null}
                </View>
                <TouchableOpacity
                  style={fieldStyles.referenceRemoveAction}
                  onPress={() => removeReference(index)}
                  disabled={disabled}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${reference.displayName}`}
                  accessibilityState={{ disabled }}
                >
                  <Text style={fieldStyles.referenceRemoveLabel}>REMOVE ×</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      ) : null}

      {duplicate ? (
        <Text style={fieldStyles.referenceFeedback} accessibilityLiveRegion="polite">
          THAT {upperEntity} IS ALREADY ON THE LIST.
        </Text>
      ) : limitReached ? (
        <Text style={fieldStyles.limitText} accessibilityLiveRegion="polite">
          MAXIMUM {maxSelections} {upperPlural} ADDED — REMOVE ONE TO CHANGE.
        </Text>
      ) : null}
    </FieldFrame>
  );
}

interface ReferenceResultRowProps {
  entity: ResolvedReferenceEntity | ProviderReferenceEntity;
  labels: EntityReferenceResolverLabels;
  onSelect: () => void;
  onOpenUrl: (url?: string | null) => void;
  disabled: boolean;
}

const ReferenceResultRow: React.FC<ReferenceResultRowProps> = ({
  entity,
  labels,
  onSelect,
  onOpenUrl,
  disabled,
}) => (
  <View style={fieldStyles.referenceResultRow}>
    {entity.imageUrl ? (
      <Image
        source={{ uri: entity.imageUrl }}
        style={fieldStyles.referenceResultImage}
        accessibilityLabel={`${entity.name} ${labels.entityName.toLowerCase()} image`}
      />
    ) : (
      <View style={fieldStyles.referenceResultImageFallback} accessibilityLabel={`${entity.name} image unavailable`}>
        <Text style={fieldStyles.referenceResultImageFallbackLabel}>{labels.fallbackImageLabel}</Text>
      </View>
    )}
    <View style={fieldStyles.referenceResultCopy}>
      <TouchableOpacity
        style={fieldStyles.referenceResultSelect}
        onPress={onSelect}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`Select ${entity.name}`}
      >
        <Text style={fieldStyles.referenceName}>{entity.name}</Text>
        {entity.secondaryText ? <Text style={fieldStyles.referenceSelectedType}>{entity.secondaryText}</Text> : null}
        <Text style={fieldStyles.referenceSelectLabel}>SELECT →</Text>
      </TouchableOpacity>
      {entity.imageUrl
      && (entity.imageAttributions?.length || entity.imageSourceUrl) ? (
        <ReferenceImageAttributions
          attributions={entity.imageAttributions}
          sourceUrl={entity.imageSourceUrl}
          onOpenUrl={onOpenUrl}
        />
      ) : null}
    </View>
    {entity.externalUrl ? (
      <TouchableOpacity
        style={fieldStyles.referenceSpotifyLink}
        onPress={() => onOpenUrl(entity.externalUrl)}
        accessibilityRole="link"
        accessibilityLabel={`View ${entity.name} on ${labels.providerName}`}
      >
        <Text style={fieldStyles.referenceSpotifyLinkLabel}>{labels.providerLinkLabel} ↗</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

interface ReferenceImageAttributionsProps {
  attributions?: ReferenceImageAttribution[];
  sourceUrl?: string | null;
  onOpenUrl: (url?: string | null) => void;
}

const ReferenceImageAttributions: React.FC<ReferenceImageAttributionsProps> = ({
  attributions = [],
  sourceUrl,
  onOpenUrl,
}) => (
  <View style={fieldStyles.referenceAttributionList} accessibilityLabel="Photo attribution">
    {attributions.map((attribution, index) => {
      const content = (
        <>
          {attribution.photoUri ? (
            <Image
              source={{ uri: attribution.photoUri }}
              style={fieldStyles.referenceAttributionAvatar}
              accessibilityLabel={`${attribution.displayName ?? 'Google contributor'} profile image`}
            />
          ) : null}
          <Text style={fieldStyles.referenceAttributionText}>
            {`PHOTO: ${attribution.displayName ?? 'Google contributor'}`}
          </Text>
        </>
      );
      return attribution.uri ? (
        <TouchableOpacity
          key={`${attribution.uri}:${index}`}
          style={fieldStyles.referenceAttributionItem}
          onPress={() => onOpenUrl(attribution.uri)}
          accessibilityRole="link"
          accessibilityLabel={`Photo by ${attribution.displayName ?? 'Google contributor'}`}
        >
          {content}
        </TouchableOpacity>
      ) : (
        <View key={`${attribution.displayName ?? 'attribution'}:${index}`} style={fieldStyles.referenceAttributionItem}>
          {content}
        </View>
      );
    })}
    {sourceUrl ? (
      <TouchableOpacity
        style={fieldStyles.referenceAttributionItem}
        onPress={() => onOpenUrl(sourceUrl)}
        accessibilityRole="link"
        accessibilityLabel="View source photo on Google Maps"
      >
        <Text style={fieldStyles.referenceAttributionText}>PHOTO ON GOOGLE ↗</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);
