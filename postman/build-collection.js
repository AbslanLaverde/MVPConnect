const fs = require('fs');
const path = require('path');

const postmanDir = __dirname;
const collectionPath = path.join(postmanDir, 'MVPConnect-Backend-E2E.postman_collection.json');
const environmentPath = path.join(postmanDir, 'MVPConnect-Local.postman_environment.json');

const jsonHeaders = [{ key: 'Content-Type', value: 'application/json', type: 'text' }];

function event(listen, lines) {
  return {
    listen,
    script: {
      type: 'text/javascript',
      packages: {},
      exec: lines,
    },
  };
}

function item(name, method, url, options = {}) {
  const headers = options.headers ? [...options.headers] : [];
  if (options.json !== undefined) headers.unshift(...jsonHeaders);
  const request = {
    method,
    header: headers,
    url,
    description: options.description || '',
  };
  if (options.token) {
    request.auth = {
      type: 'bearer',
      bearer: [{ key: 'token', value: `{{${options.token}}}`, type: 'string' }],
    };
  } else {
    request.auth = { type: 'noauth' };
  }
  if (options.json !== undefined) {
    request.body = {
      mode: 'raw',
      raw: typeof options.json === 'string'
        ? options.json
        : JSON.stringify(options.json, null, 2),
      options: { raw: { language: 'json' } },
    };
  } else if (options.file) {
    request.body = {
      mode: 'file',
      file: { src: options.file },
    };
  }
  const result = { name, request, response: [] };
  const events = [];
  if (options.pre) events.push(event('prerequest', options.pre));
  if (options.tests) events.push(event('test', options.tests));
  if (events.length) result.event = events;
  return result;
}

function folder(name, items, description = '') {
  return { name, description, item: items };
}

function status(expected) {
  return [`pm.test('HTTP ${expected}', () => pm.response.to.have.status(${expected}));`];
}

function authCapture(persona, jwtVariable, idVariable, emailVariable) {
  return [
    ...status(201),
    'const json = pm.response.json();',
    "pm.test('JWT returned', () => pm.expect(json.accessToken).to.be.a('string').and.not.empty);",
    `pm.test('Persona is ${persona}', () => pm.expect(json.userType).to.eql('${persona}'));`,
    `pm.environment.set('${jwtVariable}', json.accessToken);`,
    `pm.environment.set('${idVariable}', json.userId);`,
    `pm.environment.set('${emailVariable}', json.email);`,
  ];
}

function loginCapture(persona, jwtVariable, idVariable) {
  return [
    ...status(200),
    'const json = pm.response.json();',
    "pm.test('JWT returned', () => pm.expect(json.accessToken).to.be.a('string').and.not.empty);",
    `pm.test('Persona is ${persona}', () => pm.expect(json.userType).to.eql('${persona}'));`,
    `pm.test('User ID is stable', () => pm.expect(json.userId).to.eql(pm.environment.get('${idVariable}')));`,
    `pm.environment.set('${jwtVariable}', json.accessToken);`,
  ];
}

function initMedia(
  name,
  token,
  mediaIdVariable,
  uploadUrlVariable,
  mediaType = 'PROFILE_IMAGE',
  mediaContext = 'PROFILE',
  sortOrder = 0,
) {
  return item(name, 'POST', '{{baseUrl}}/media/uploads', {
    token,
    json: {
      mediaType,
      mediaContext,
      fileName: `e2e-${mediaIdVariable}-{{e2eRunId}}.jpg`,
      mimeType: 'image/jpeg',
      sizeBytes: 34954,
      width: 600,
      height: 300,
      sortOrder,
    },
    tests: [
      ...status(201),
      'const json = pm.response.json();',
      "pm.test('Upload initialized as PENDING', () => pm.expect(json.status).to.eql('PENDING'));",
      "pm.test('Presigned URL returned', () => pm.expect(json.uploadUrl).to.match(/^http/));",
      "pm.test('Required content type returned', () => pm.expect(json.requiredHeaders['Content-Type']).to.eql('image/jpeg'));",
      `pm.environment.set('${mediaIdVariable}', json.mediaId);`,
      `pm.environment.set('${uploadUrlVariable}', json.uploadUrl);`,
    ],
  });
}

function uploadMedia(name, uploadUrlVariable) {
  return item(name, 'PUT', `{{${uploadUrlVariable}}}`, {
    file: 'mvpconnect-app/assets/matches/glass-houses.jpg',
    headers: [{ key: 'Content-Type', value: 'image/jpeg', type: 'text' }],
    tests: [
      "pm.test('Object storage accepted bytes', () => pm.expect([200, 204]).to.include(pm.response.code));",
    ],
  });
}

function completeMedia(name, token, mediaIdVariable) {
  return item(name, 'POST', `{{baseUrl}}/media/{{${mediaIdVariable}}}/complete`, {
    token,
    tests: [
      ...status(200),
      'const json = pm.response.json();',
      "pm.test('Media is READY', () => pm.expect(json.status).to.eql('READY'));",
      `pm.test('Media ID is stable', () => pm.expect(json.id).to.eql(pm.environment.get('${mediaIdVariable}')));`,
    ],
  });
}

function getMedia(name, token, mediaIdVariable, expectedType = 'PROFILE_IMAGE') {
  return item(name, 'GET', `{{baseUrl}}/media/{{${mediaIdVariable}}}`, {
    token,
    tests: [
      ...status(200),
      'const json = pm.response.json();',
      `pm.test('Media type is ${expectedType}', () => pm.expect(json.mediaType).to.eql('${expectedType}'));`,
      "pm.test('Media is READY', () => pm.expect(json.status).to.eql('READY'));",
      "pm.test('Temporary access URL returned', () => pm.expect(json.url).to.match(/^http/));",
      "pm.test('Temporary URL has expiry', () => pm.expect(json.urlExpiresAt).to.be.a('string'));",
    ],
  });
}

function associateMedia(name, token, stepKey, mediaIdVariable) {
  return item(name, 'POST', `{{baseUrl}}/onboarding/steps/${stepKey}/media/{{${mediaIdVariable}}}`, {
    token,
    tests: status(204),
  });
}

function fullMediaFlow(label, token, mediaIdVariable, uploadUrlVariable, stepKey) {
  return [
    initMedia(`${label} - Initialize profile image`, token, mediaIdVariable, uploadUrlVariable),
    uploadMedia(`${label} - Upload bytes directly to MinIO`, uploadUrlVariable),
    completeMedia(`${label} - Complete upload`, token, mediaIdVariable),
    completeMedia(`${label} - Complete READY upload again`, token, mediaIdVariable),
    getMedia(`${label} - Read owned media`, token, mediaIdVariable),
    associateMedia(`${label} - Associate profile image`, token, stepKey, mediaIdVariable),
  ];
}

function completeStep(name, token, stepKey, data, assertions = []) {
  return item(name, 'POST', `{{baseUrl}}/onboarding/steps/${stepKey}/complete`, {
    token,
    json: { data },
    tests: [
      ...status(200),
      'const json = pm.response.json();',
      `const step = json.steps.find(candidate => candidate.key === '${stepKey}');`,
      `pm.test('${stepKey} is COMPLETE', () => pm.expect(step.status).to.eql('COMPLETE'));`,
      ...assertions,
    ],
  });
}

function negativeStep(name, token, stepKey, data, field, code) {
  return item(name, 'PUT', `{{baseUrl}}/onboarding/steps/${stepKey}`, {
    token,
    json: { data },
    tests: [
      ...status(400),
      'const json = pm.response.json();',
      "pm.test('Typed contract rejected', () => pm.expect(json.code).to.eql('ONBOARDING_STEP_INVALID'));",
      `pm.test('${field} reports ${code}', () => {`,
      `  const match = json.details.fields.some(error => error.field === '${field}' && error.code === '${code}');`,
      '  pm.expect(match).to.eql(true);',
      '});',
    ],
  });
}

const artistBasics = {
  profileImage: { mediaId: '{{artistProfileMediaId}}' },
  bio: 'Brooklyn post-punk band.',
  location: {
    displayName: 'Brooklyn, NY',
    addressLine1: null,
    addressLine2: null,
    city: 'Brooklyn',
    state: 'NY',
    postalCode: null,
    country: 'United States',
    latitude: null,
    longitude: null,
    neighborhood: 'Williamsburg',
    placeId: null,
  },
};

const artistSound = {
  genres: ['INDIE', 'PUNK'],
  vibes: ['RAW', 'ENERGETIC'],
  eventTypes: ['CONCERT', 'SHOWCASE'],
  soundsLikeArtists: [{
    entityType: 'ARTIST',
    entityId: null,
    displayName: 'Fontaines D.C.',
    external: true,
  }],
};

const artistLive = {
  bookingStatus: 'ACTIVELY_BOOKING',
  typicalDraw: 'FROM_50_TO_100',
  travelRadiusMiles: 100,
  touring: false,
  setLengthMinutes: 45,
  equipmentBrought: ['GUITAR_AMP', 'BASS_AMP'],
  venuesPlayed: [{
    entityType: 'VENUE',
    entityId: '{{venueId}}',
    displayName: 'E2E Marlowe Room',
    external: false,
  }],
  performanceImages: [],
};

const venueRoom = {
  profileImage: { mediaId: '{{venueProfileMediaId}}' },
  description: 'Independent live room in Brooklyn.',
  location: {
    displayName: '123 Bedford Ave, Brooklyn, NY',
    addressLine1: '123 Bedford Ave',
    addressLine2: null,
    city: 'Brooklyn',
    state: 'NY',
    postalCode: '11211',
    country: 'United States',
    latitude: null,
    longitude: null,
    neighborhood: 'Williamsburg',
    placeId: null,
  },
  capacity: 250,
};

const venueMusic = {
  genres: ['INDIE', 'ROCK'],
  ambience: ['INTIMATE', 'RAW'],
  eventTypes: ['CONCERT', 'SHOWCASE'],
  artistsBooked: [{
    entityType: 'ARTIST',
    entityId: '{{artistId}}',
    displayName: 'E2E Glass Houses',
    external: false,
  }],
};

const venueStage = {
  stageWidthFeet: 20,
  stageDepthFeet: 12,
  soundEngineerAvailability: 'IN_HOUSE',
  paAvailability: 'FULL_HOUSE_PA',
  equipmentAvailable: ['DRUM_KIT', 'MICROPHONES', 'STAGE_MONITORS'],
  productionAmenities: ['GREEN_ROOM', 'LOAD_IN_ACCESS', 'MERCH_AREA'],
};

const venueBooking = {
  bookingStatus: 'ACTIVELY_BOOKING',
  bookingMethod: 'BOTH',
  desiredArtistDraw: 'FROM_50_TO_100',
  bookingEmail: 'booking@example.local',
};

const promoterBusiness = {
  profileImage: { mediaId: '{{promoterProfileMediaId}}' },
  bio: 'Independent NYC show promoter.',
  location: {
    displayName: 'New York, NY',
    addressLine1: null,
    addressLine2: null,
    city: 'New York',
    state: 'NY',
    postalCode: null,
    country: 'United States',
    latitude: null,
    longitude: null,
    neighborhood: 'Lower East Side',
    placeId: null,
  },
  websiteUrl: 'https://example.com',
  phone: '212-555-0100',
};

const promoterSpecialties = {
  genres: ['INDIE', 'PUNK'],
  eventTypes: ['CONCERT', 'SHOWCASE'],
  vibes: ['RAW', 'ENERGETIC'],
  artistsWorkedWith: [{
    entityType: 'ARTIST',
    entityId: '{{artistId}}',
    displayName: 'E2E Glass Houses',
    external: false,
  }],
};

const promoterNetwork = {
  acceptingStatus: 'ACTIVELY_ACCEPTING',
  rosterSize: 'ONE_TO_FIVE',
  artists: [{
    entityType: 'ARTIST',
    entityId: '{{artistId}}',
    displayName: 'E2E Glass Houses',
    external: false,
  }],
  venues: [{
    entityType: 'VENUE',
    entityId: '{{venueId}}',
    displayName: 'E2E Marlowe Room',
    external: false,
  }],
  additionalMarkets: [{
    displayName: 'Philadelphia, PA',
    addressLine1: null,
    addressLine2: null,
    city: 'Philadelphia',
    state: 'PA',
    postalCode: null,
    country: 'United States',
    latitude: null,
    longitude: null,
    neighborhood: null,
    placeId: null,
  }],
  pastShows: [],
};

const initializeRun = item('Initialize run and check backend health', 'GET', '{{baseUrl}}/actuator/health', {
  pre: [
    "const e2eRunId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;",
    "pm.environment.set('e2eRunId', e2eRunId);",
    "pm.environment.set('artistEmail', `e2e-artist-${e2eRunId}@example.local`);",
    "pm.environment.set('venueEmail', `e2e-venue-${e2eRunId}@example.local`);",
    "pm.environment.set('promoterEmail', `e2e-promoter-${e2eRunId}@example.local`);",
    "pm.environment.set('resumeArtistEmail', `e2e-resume-${e2eRunId}@example.local`);",
    "['artistJwt','venueJwt','promoterJwt','resumeArtistJwt','artistId','venueId','promoterId','resumeArtistId',",
    " 'artistProfileMediaId','venueProfileMediaId','promoterProfileMediaId','artistBannerMediaId',",
    " 'venueBannerMediaId','venueGalleryMediaId','promoterBannerMediaId','artistUnassociatedProfileMediaId','artistPendingMediaId'].forEach(key => pm.environment.unset(key));",
  ],
  tests: [
    ...status(200),
    'const json = pm.response.json();',
    "pm.test('Backend reports UP', () => pm.expect(json.status).to.eql('UP'));",
  ],
  description: 'Resets all run-scoped variables and generates collision-resistant local test emails.',
});

const livenessCheck = item('Check application liveness', 'GET', '{{baseUrl}}/actuator/health/liveness', {
  tests: [
    ...status(200),
    'const json = pm.response.json();',
    "pm.test('Liveness is UP', () => pm.expect(json.status).to.eql('UP'));",
    "pm.test('Liveness is process-only', () => { pm.expect(json.components.livenessState.status).to.eql('UP'); pm.expect(json.components).not.to.have.property('neo4j'); pm.expect(json.components).not.to.have.property('objectStorage'); });",
  ],
});

const readinessCheck = item('Check dependency readiness', 'GET', '{{baseUrl}}/actuator/health/readiness', {
  tests: [
    ...status(200),
    'const json = pm.response.json();',
    "pm.test('Readiness is UP', () => pm.expect(json.status).to.eql('UP'));",
    "pm.test('Neo4j is ready', () => pm.expect(json.components.neo4j.status).to.eql('UP'));",
    "pm.test('Object storage is ready', () => pm.expect(json.components.objectStorage.status).to.eql('UP'));",
  ],
});

const authFolder = folder('01 - Auth', [
  item('Sign up Artist / Musician', 'POST', '{{baseUrl}}/auth/signup/musician', {
    json: {
      name: 'E2E Glass Houses',
      email: '{{artistEmail}}',
      password: '{{testPassword}}',
      minimumFee: '$777 legacy sentinel',
      willingToTravel: true,
      profileImageUrl: 'https://legacy.example/artist.jpg',
    },
    tests: authCapture('MUSICIAN', 'artistJwt', 'artistId', 'artistEmail'),
  }),
  item('Sign up Venue', 'POST', '{{baseUrl}}/auth/signup/venue', {
    json: {
      venueName: 'E2E Marlowe Room',
      email: '{{venueEmail}}',
      password: '{{testPassword}}',
      typicalBudget: '$999 legacy sentinel',
      liveMusic: true,
      logoUrl: 'https://legacy.example/venue.jpg',
    },
    tests: authCapture('VENUE', 'venueJwt', 'venueId', 'venueEmail'),
  }),
  item('Sign up Promoter', 'POST', '{{baseUrl}}/auth/signup/promoter', {
    json: {
      businessName: 'E2E Night Signal Presents',
      email: '{{promoterEmail}}',
      password: '{{testPassword}}',
      acceptingNewArtists: false,
      currentRosterSize: 77,
      logoUrl: 'https://legacy.example/promoter.jpg',
    },
    tests: authCapture('PROMOTER', 'promoterJwt', 'promoterId', 'promoterEmail'),
  }),
  item('Login Artist', 'POST', '{{baseUrl}}/auth/login', {
    json: { email: '{{artistEmail}}', password: '{{testPassword}}' },
    tests: loginCapture('MUSICIAN', 'artistJwt', 'artistId'),
  }),
  item('Login Venue', 'POST', '{{baseUrl}}/auth/login', {
    json: { email: '{{venueEmail}}', password: '{{testPassword}}' },
    tests: loginCapture('VENUE', 'venueJwt', 'venueId'),
  }),
  item('Login Promoter', 'POST', '{{baseUrl}}/auth/login', {
    json: { email: '{{promoterEmail}}', password: '{{testPassword}}' },
    tests: loginCapture('PROMOTER', 'promoterJwt', 'promoterId'),
  }),
]);

const mediaFolderItems = [
  item('Create Artist onboarding draft', 'GET', '{{baseUrl}}/onboarding', {
    token: 'artistJwt',
    tests: [...status(200), "pm.test('Artist draft', () => pm.expect(pm.response.json().persona).to.eql('MUSICIAN'));"],
  }),
  item('Create Venue onboarding draft', 'GET', '{{baseUrl}}/onboarding', {
    token: 'venueJwt',
    tests: [...status(200), "pm.test('Venue draft', () => pm.expect(pm.response.json().persona).to.eql('VENUE'));"],
  }),
  item('Create Promoter onboarding draft', 'GET', '{{baseUrl}}/onboarding', {
    token: 'promoterJwt',
    tests: [...status(200), "pm.test('Promoter draft', () => pm.expect(pm.response.json().persona).to.eql('PROMOTER'));"],
  }),
  ...fullMediaFlow('Artist', 'artistJwt', 'artistProfileMediaId', 'artistProfileUploadUrl', 'basics'),
  ...fullMediaFlow('Venue', 'venueJwt', 'venueProfileMediaId', 'venueProfileUploadUrl', 'room'),
  ...fullMediaFlow('Promoter', 'promoterJwt', 'promoterProfileMediaId', 'promoterProfileUploadUrl', 'business'),
  initMedia('Artist unassociated profile - Initialize', 'artistJwt',
    'artistUnassociatedProfileMediaId', 'artistUnassociatedProfileUploadUrl'),
  uploadMedia('Artist unassociated profile - Upload', 'artistUnassociatedProfileUploadUrl'),
  completeMedia('Artist unassociated profile - Complete', 'artistJwt', 'artistUnassociatedProfileMediaId'),
  initMedia('Artist banner - Initialize', 'artistJwt',
    'artistBannerMediaId', 'artistBannerUploadUrl', 'BANNER_IMAGE'),
  uploadMedia('Artist banner - Upload', 'artistBannerUploadUrl'),
  completeMedia('Artist banner - Complete', 'artistJwt', 'artistBannerMediaId'),
  associateMedia('Artist banner - Associate with basics for wrong-type test',
    'artistJwt', 'basics', 'artistBannerMediaId'),
  associateMedia('Artist banner - Associate with optional media step',
    'artistJwt', 'media', 'artistBannerMediaId'),
  initMedia('Venue banner - Initialize', 'venueJwt',
    'venueBannerMediaId', 'venueBannerUploadUrl', 'BANNER_IMAGE', 'VENUE'),
  uploadMedia('Venue banner - Upload', 'venueBannerUploadUrl'),
  completeMedia('Venue banner - Complete', 'venueJwt', 'venueBannerMediaId'),
  associateMedia('Venue banner - Associate with optional media step',
    'venueJwt', 'media', 'venueBannerMediaId'),
  initMedia('Venue gallery - Initialize', 'venueJwt',
    'venueGalleryMediaId', 'venueGalleryUploadUrl', 'GALLERY_IMAGE', 'VENUE'),
  uploadMedia('Venue gallery - Upload', 'venueGalleryUploadUrl'),
  completeMedia('Venue gallery - Complete', 'venueJwt', 'venueGalleryMediaId'),
  associateMedia('Venue gallery - Associate with optional media step',
    'venueJwt', 'media', 'venueGalleryMediaId'),
  initMedia('Promoter banner - Initialize', 'promoterJwt',
    'promoterBannerMediaId', 'promoterBannerUploadUrl', 'BANNER_IMAGE', 'EVENT'),
  uploadMedia('Promoter banner - Upload', 'promoterBannerUploadUrl'),
  completeMedia('Promoter banner - Complete', 'promoterJwt', 'promoterBannerMediaId'),
  associateMedia('Promoter banner - Associate with optional media step',
    'promoterJwt', 'media', 'promoterBannerMediaId'),
  initMedia('Artist pending image - Initialize only', 'artistJwt',
    'artistPendingMediaId', 'artistPendingUploadUrl'),
  item('Complete before object exists', 'POST', '{{baseUrl}}/media/{{artistPendingMediaId}}/complete', {
    token: 'artistJwt',
    tests: [
      ...status(409),
      "pm.test('Missing upload rejected', () => pm.expect(pm.response.json().code).to.eql('MEDIA_UPLOAD_NOT_FOUND'));",
    ],
  }),
  item('Reject unsupported MIME type', 'POST', '{{baseUrl}}/media/uploads', {
    token: 'artistJwt',
    json: {
      mediaType: 'PROFILE_IMAGE', mediaContext: 'PROFILE', fileName: 'bad.pdf',
      mimeType: 'application/pdf', sizeBytes: 100, width: 10, height: 10, sortOrder: 0,
    },
    tests: [
      ...status(400),
      "pm.test('MIME rejected', () => pm.expect(pm.response.json().code).to.eql('INVALID_MEDIA_TYPE'));",
    ],
  }),
  item('Reject oversized declared file', 'POST', '{{baseUrl}}/media/uploads', {
    token: 'artistJwt',
    json: {
      mediaType: 'PROFILE_IMAGE', mediaContext: 'PROFILE', fileName: 'large.jpg',
      mimeType: 'image/jpeg', sizeBytes: 10485761, width: 10, height: 10, sortOrder: 0,
    },
    tests: [
      ...status(413),
      "pm.test('Oversize rejected', () => pm.expect(pm.response.json().code).to.eql('MEDIA_TOO_LARGE'));",
    ],
  }),
];

const artistFolder = folder('03 - Artist Onboarding', [
  item('Get Artist onboarding structure', 'GET', '{{baseUrl}}/onboarding', {
    token: 'artistJwt',
    tests: [
      ...status(200),
      'const json = pm.response.json();',
      "pm.test('Persona is MUSICIAN', () => pm.expect(json.persona).to.eql('MUSICIAN'));",
      "pm.test('Five exact steps', () => pm.expect(json.steps.map(step => step.key)).to.eql(['basics','sound','live','media','goals']));",
      "pm.test('Media optional', () => pm.expect(json.steps.find(step => step.key === 'media').required).to.eql(false));",
    ],
  }),
  item('Save Artist basics draft', 'PUT', '{{baseUrl}}/onboarding/steps/basics', {
    token: 'artistJwt', json: { data: artistBasics },
    tests: [
      ...status(200),
      "pm.test('Basics in progress', () => pm.expect(pm.response.json().status).to.eql('IN_PROGRESS'));",
    ],
  }),
  completeStep('Complete Artist basics', 'artistJwt', 'basics', artistBasics, [
    "pm.test('Current step is sound', () => pm.expect(json.currentStep).to.eql('sound'));",
  ]),
  completeStep('Complete Artist sound', 'artistJwt', 'sound', artistSound, [
    "pm.test('Current step is live', () => pm.expect(json.currentStep).to.eql('live'));",
  ]),
  completeStep('Complete Artist live', 'artistJwt', 'live', artistLive),
  item('Skip Artist media', 'POST', '{{baseUrl}}/onboarding/steps/media/skip', {
    token: 'artistJwt',
    tests: [
      ...status(200),
      'const json = pm.response.json();',
      "pm.test('Media skipped', () => pm.expect(json.steps.find(step => step.key === 'media').status).to.eql('SKIPPED'));",
    ],
  }),
  item('Reopen Artist media after skip coverage', 'POST', '{{baseUrl}}/onboarding/steps/media/reopen', {
    token: 'artistJwt',
    tests: [...status(200), "pm.test('Artist media reopened', () => pm.expect(pm.response.json().steps.find(step => step.key === 'media').status).to.eql('IN_PROGRESS'));"],
  }),
  completeStep('Complete Artist optional media', 'artistJwt', 'media', {
    bannerImage: { mediaId: '{{artistBannerMediaId}}' },
    websiteUrl: 'https://glasshouses.example',
  }),
  completeStep('Complete Artist goals', 'artistJwt', 'goals', {
    connectionGoals: ['BOOK_SHOWS', 'FIND_PROMOTERS', 'START_OR_JOIN_BAND'],
  }, ["pm.test('Artist draft READY', () => pm.expect(json.status).to.eql('READY'));" ]),
]);

const venueFolder = folder('04 - Venue Onboarding', [
  item('Get Venue onboarding structure', 'GET', '{{baseUrl}}/onboarding', {
    token: 'venueJwt',
    tests: [
      ...status(200),
      'const json = pm.response.json();',
      "pm.test('Six exact steps', () => pm.expect(json.steps.map(step => step.key)).to.eql(['room','music','stage','booking','media','goals']));",
      "pm.test('Media optional', () => pm.expect(json.steps.find(step => step.key === 'media').required).to.eql(false));",
    ],
  }),
  completeStep('Complete Venue room', 'venueJwt', 'room', venueRoom),
  completeStep('Complete Venue music', 'venueJwt', 'music', venueMusic),
  completeStep('Complete Venue stage', 'venueJwt', 'stage', venueStage),
  completeStep('Complete Venue booking', 'venueJwt', 'booking', venueBooking),
  item('Skip Venue media', 'POST', '{{baseUrl}}/onboarding/steps/media/skip', {
    token: 'venueJwt',
    tests: [...status(200), "pm.test('Media skipped', () => pm.expect(pm.response.json().steps.find(step => step.key === 'media').status).to.eql('SKIPPED'));"],
  }),
  item('Reopen Venue media after skip coverage', 'POST', '{{baseUrl}}/onboarding/steps/media/reopen', {
    token: 'venueJwt',
    tests: [...status(200), "pm.test('Venue media reopened', () => pm.expect(pm.response.json().steps.find(step => step.key === 'media').status).to.eql('IN_PROGRESS'));"],
  }),
  completeStep('Complete Venue optional media', 'venueJwt', 'media', {
    bannerImage: { mediaId: '{{venueBannerMediaId}}' },
    websiteUrl: 'https://marloweroom.example',
    galleryImages: [{ mediaId: '{{venueGalleryMediaId}}' }],
  }),
  completeStep('Complete Venue goals', 'venueJwt', 'goals', {
    connectionGoals: ['FIND_ARTISTS', 'FILL_OPEN_DATES'],
  }, ["pm.test('Venue draft READY', () => pm.expect(json.status).to.eql('READY'));" ]),
]);

const promoterFolder = folder('05 - Promoter Onboarding', [
  item('Get Promoter onboarding structure', 'GET', '{{baseUrl}}/onboarding', {
    token: 'promoterJwt',
    tests: [
      ...status(200),
      'const json = pm.response.json();',
      "pm.test('Five exact steps', () => pm.expect(json.steps.map(step => step.key)).to.eql(['business','specialties','network','media','goals']));",
      "pm.test('Media optional', () => pm.expect(json.steps.find(step => step.key === 'media').required).to.eql(false));",
    ],
  }),
  completeStep('Complete Promoter business', 'promoterJwt', 'business', promoterBusiness),
  completeStep('Complete Promoter specialties', 'promoterJwt', 'specialties', promoterSpecialties),
  completeStep('Complete Promoter network', 'promoterJwt', 'network', promoterNetwork),
  item('Skip Promoter media', 'POST', '{{baseUrl}}/onboarding/steps/media/skip', {
    token: 'promoterJwt',
    tests: [...status(200), "pm.test('Media skipped', () => pm.expect(pm.response.json().steps.find(step => step.key === 'media').status).to.eql('SKIPPED'));"],
  }),
  item('Reopen Promoter media after skip coverage', 'POST', '{{baseUrl}}/onboarding/steps/media/reopen', {
    token: 'promoterJwt',
    tests: [...status(200), "pm.test('Promoter media reopened', () => pm.expect(pm.response.json().steps.find(step => step.key === 'media').status).to.eql('IN_PROGRESS'));"],
  }),
  completeStep('Complete Promoter optional media', 'promoterJwt', 'media', {
    bannerImage: { mediaId: '{{promoterBannerMediaId}}' },
  }),
  completeStep('Complete Promoter goals', 'promoterJwt', 'goals', {
    connectionGoals: ['FIND_ARTISTS', 'FIND_VENUES', 'BUILD_MY_ROSTER'],
  }, ["pm.test('Promoter draft READY', () => pm.expect(json.status).to.eql('READY'));" ]),
]);

const resumeBasics = JSON.parse(JSON.stringify(artistBasics).replace(
  '{{artistProfileMediaId}}', '{{resumeArtistProfileMediaId}}'));

const resumeFolder = folder('06 - Onboarding Resume', [
  item('Sign up disposable resume Artist', 'POST', '{{baseUrl}}/auth/signup/musician', {
    json: { name: 'E2E Resume Artist', email: '{{resumeArtistEmail}}', password: '{{testPassword}}' },
    tests: authCapture('MUSICIAN', 'resumeArtistJwt', 'resumeArtistId', 'resumeArtistEmail'),
  }),
  item('Create resume Artist draft', 'GET', '{{baseUrl}}/onboarding', {
    token: 'resumeArtistJwt', tests: status(200),
  }),
  initMedia('Resume Artist - Initialize profile image', 'resumeArtistJwt',
    'resumeArtistProfileMediaId', 'resumeArtistProfileUploadUrl'),
  uploadMedia('Resume Artist - Upload profile bytes', 'resumeArtistProfileUploadUrl'),
  completeMedia('Resume Artist - Complete profile upload', 'resumeArtistJwt', 'resumeArtistProfileMediaId'),
  associateMedia('Resume Artist - Associate profile image', 'resumeArtistJwt', 'basics', 'resumeArtistProfileMediaId'),
  completeStep('Resume Artist - Complete basics', 'resumeArtistJwt', 'basics', resumeBasics),
  completeStep('Resume Artist - Complete sound', 'resumeArtistJwt', 'sound', artistSound),
  item('Login resume Artist again', 'POST', '{{baseUrl}}/auth/login', {
    json: { email: '{{resumeArtistEmail}}', password: '{{testPassword}}' },
    tests: loginCapture('MUSICIAN', 'resumeArtistJwt', 'resumeArtistId'),
  }),
  item('Verify persisted resume state', 'GET', '{{baseUrl}}/onboarding', {
    token: 'resumeArtistJwt',
    tests: [
      ...status(200),
      'const json = pm.response.json();',
      "pm.test('Resume at live', () => pm.expect(json.currentStep).to.eql('live'));",
      "pm.test('Basics retained', () => pm.expect(json.steps.find(step => step.key === 'basics').status).to.eql('COMPLETE'));",
      "pm.test('Sound retained', () => pm.expect(json.steps.find(step => step.key === 'sound').status).to.eql('COMPLETE'));",
      "pm.test('Live remains unresolved', () => pm.expect(json.steps.find(step => step.key === 'live').status).to.eql('NOT_STARTED'));",
      "pm.test('Normalized data retained', () => pm.expect(json.steps.find(step => step.key === 'sound').data.genres).to.eql(['INDIE','PUNK']));",
    ],
  }),
]);

const missingProfile = { ...artistBasics, profileImage: null };
const pendingProfile = { ...artistBasics, profileImage: { mediaId: '{{artistPendingMediaId}}' } };
const unassociatedProfile = { ...artistBasics, profileImage: { mediaId: '{{artistUnassociatedProfileMediaId}}' } };
const wrongTypeProfile = { ...artistBasics, profileImage: { mediaId: '{{artistBannerMediaId}}' } };

const negativeFolder = folder('07 - Negative Validation', [
  negativeStep('Missing required profile image', 'artistJwt', 'basics',
    missingProfile, 'profileImage', 'REQUIRED'),
  negativeStep('Profile image is not READY', 'artistJwt', 'basics',
    pendingProfile, 'profileImage.mediaId', 'MEDIA_NOT_READY'),
  negativeStep('READY profile image is not associated', 'artistJwt', 'basics',
    unassociatedProfile, 'profileImage.mediaId', 'MEDIA_NOT_ASSOCIATED'),
  negativeStep('BANNER_IMAGE rejected as profile image', 'artistJwt', 'basics',
    wrongTypeProfile, 'profileImage.mediaId', 'MEDIA_WRONG_TYPE'),
  negativeStep('Unknown field rejected', 'artistJwt', 'sound',
    { ...artistSound, garbageField: 'hello' }, 'garbageField', 'INVALID'),
  negativeStep('Invalid genre enum rejected', 'artistJwt', 'sound',
    { ...artistSound, genres: ['NOT_A_GENRE'] }, 'genres[0]', 'INVALID'),
  negativeStep('Six genres rejected', 'artistJwt', 'sound',
    { ...artistSound, genres: ['INDIE', 'PUNK', 'ROCK', 'FOLK', 'POP', 'SOUL'] }, 'genres', 'TOO_MANY'),
  negativeStep('Duplicate genre rejected', 'artistJwt', 'sound',
    { ...artistSound, genres: ['INDIE', 'INDIE'] }, 'genres', 'DUPLICATE'),
  negativeStep('Artist travel configuration required', 'artistJwt', 'live',
    { ...artistLive, touring: false, travelRadiusMiles: null }, 'travelRadiusMiles', 'REQUIRED'),
  negativeStep('Venue room requires address line 1', 'venueJwt', 'room',
    { ...venueRoom, location: { ...venueRoom.location, addressLine1: null } },
    'location.addressLine1', 'REQUIRED'),
  negativeStep('Venue capacity must be positive', 'venueJwt', 'room',
    { ...venueRoom, capacity: 0 }, 'capacity', 'INVALID'),
  negativeStep('Venue booking email must be valid', 'venueJwt', 'booking',
    { ...venueBooking, bookingEmail: 'not-an-email' }, 'bookingEmail', 'INVALID_FORMAT'),
  negativeStep('Promoter specialties require event types', 'promoterJwt', 'specialties',
    { ...promoterSpecialties, eventTypes: [] }, 'eventTypes', 'REQUIRED'),
  negativeStep('Promoter roster range must be defined', 'promoterJwt', 'network',
    { ...promoterNetwork, rosterSize: 'HUGE' }, 'rosterSize', 'INVALID'),
  item('Final completion before READY', 'POST', '{{baseUrl}}/onboarding/complete', {
    token: 'resumeArtistJwt',
    tests: [
      ...status(409),
      "pm.test('Completion rejected as not ready', () => pm.expect(pm.response.json().code).to.eql('ONBOARDING_NOT_READY'));",
    ],
  }),
]);

const securityFolder = folder('08 - Security / Ownership', [
  item('Artist owner can update self', 'PUT', '{{baseUrl}}/musicians/{{artistId}}', {
    token: 'artistJwt',
    json: { instagramHandle: '@e2e-self-update' },
    tests: [...status(200), "pm.test('Self update succeeds', () => pm.expect(pm.response.json().status).to.eql('updated'));"],
  }),
  item('Artist update rejects wrong JSON type', 'PUT', '{{baseUrl}}/musicians/{{artistId}}', {
    token: 'artistJwt',
    json: { bio: 42 },
    tests: [...status(400), "pm.test('Wrong type is rejected', () => pm.expect(pm.response.json().code).to.eql('INVALID_REQUEST_BODY'));"],
  }),
  item('Artist update rejects unknown field', 'PUT', '{{baseUrl}}/musicians/{{artistId}}', {
    token: 'artistJwt',
    json: { email: 'replacement@example.com' },
    tests: [...status(400), "pm.test('Unknown field is rejected', () => pm.expect(pm.response.json().code).to.eql('INVALID_REQUEST_BODY'));"],
  }),
  item('Artist update rejects non-HTTP website', 'PUT', '{{baseUrl}}/musicians/{{artistId}}', {
    token: 'artistJwt',
    json: { websiteUrl: 'ftp://example.com/profile' },
    tests: [...status(400), "pm.test('Website scheme is validated', () => pm.expect(pm.response.json().details.join(' ')).to.include('websiteUrl'));"],
  }),
  item('Artist cannot update another Artist', 'PUT', '{{baseUrl}}/musicians/{{resumeArtistId}}', {
    token: 'artistJwt',
    json: { bio: 'Unauthorized mutation' },
    tests: [...status(403), "pm.test('Owner mismatch denied', () => pm.expect(pm.response.json().code).to.eql('ACCESS_DENIED'));"],
  }),
  item('Venue cannot update Artist', 'PUT', '{{baseUrl}}/musicians/{{artistId}}', {
    token: 'venueJwt',
    json: { bio: 'Unauthorized mutation' },
    tests: [...status(403), "pm.test('Venue persona denied', () => pm.expect(pm.response.json().code).to.eql('ACCESS_DENIED'));"],
  }),
  item('Promoter cannot update Artist', 'PUT', '{{baseUrl}}/musicians/{{artistId}}', {
    token: 'promoterJwt',
    json: { bio: 'Unauthorized mutation' },
    tests: [...status(403), "pm.test('Promoter persona denied', () => pm.expect(pm.response.json().code).to.eql('ACCESS_DENIED'));"],
  }),
  item('Artist cannot GET Venue media', 'GET', '{{baseUrl}}/media/{{venueProfileMediaId}}', {
    token: 'artistJwt',
    tests: [...status(403), "pm.test('Ownership enforced', () => pm.expect(pm.response.json().code).to.eql('MEDIA_NOT_OWNED'));"],
  }),
  item('Artist cannot complete Venue media', 'POST', '{{baseUrl}}/media/{{venueProfileMediaId}}/complete', {
    token: 'artistJwt',
    tests: [...status(403), "pm.test('Ownership enforced', () => pm.expect(pm.response.json().code).to.eql('MEDIA_NOT_OWNED'));"],
  }),
  item('Artist cannot delete Venue media', 'DELETE', '{{baseUrl}}/media/{{venueProfileMediaId}}', {
    token: 'artistJwt',
    tests: [...status(403), "pm.test('Ownership enforced', () => pm.expect(pm.response.json().code).to.eql('MEDIA_NOT_OWNED'));"],
  }),
  item('Artist cannot associate Venue media', 'POST', '{{baseUrl}}/onboarding/steps/basics/media/{{venueProfileMediaId}}', {
    token: 'artistJwt',
    tests: [...status(403), "pm.test('Ownership enforced', () => pm.expect(pm.response.json().code).to.eql('MEDIA_NOT_OWNED'));"],
  }),
  negativeStep('Artist cannot reference Venue media', 'artistJwt', 'basics',
    { ...artistBasics, profileImage: { mediaId: '{{venueProfileMediaId}}' } },
    'profileImage.mediaId', 'MEDIA_NOT_OWNED'),
  item('Invalid persona step association rejected', 'POST', '{{baseUrl}}/onboarding/steps/booking/media/{{artistProfileMediaId}}', {
    token: 'artistJwt',
    tests: [...status(400), "pm.test('Invalid step rejected', () => pm.expect(pm.response.json().code).to.eql('INVALID_ONBOARDING_STEP'));"],
  }),
  item('Owner ID query cannot override JWT persona', 'GET', '{{baseUrl}}/onboarding?ownerId={{venueId}}', {
    token: 'artistJwt',
    tests: [...status(200), "pm.test('JWT owner wins', () => pm.expect(pm.response.json().persona).to.eql('MUSICIAN'));"],
  }),
  item('Unauthenticated onboarding GET rejected', 'GET', '{{baseUrl}}/onboarding', { tests: status(401) }),
  item('Unauthenticated self account GET rejected', 'GET', '{{baseUrl}}/me', { tests: status(401) }),
  item('Unauthenticated onboarding PUT rejected', 'PUT', '{{baseUrl}}/onboarding/steps/basics', {
    json: { data: artistBasics }, tests: status(401),
  }),
  item('Unauthenticated final completion rejected', 'POST', '{{baseUrl}}/onboarding/complete', { tests: status(401) }),
  item('Unauthenticated media initialize rejected', 'POST', '{{baseUrl}}/media/uploads', {
    json: {
      mediaType: 'PROFILE_IMAGE', mediaContext: 'PROFILE', fileName: 'no-auth.jpg',
      mimeType: 'image/jpeg', sizeBytes: 34954, width: 600, height: 300, sortOrder: 0,
    },
    tests: status(401),
  }),
  item('Owner deletes disposable unassociated media', 'DELETE', '{{baseUrl}}/media/{{artistUnassociatedProfileMediaId}}', {
    token: 'artistJwt', tests: status(204),
  }),
  item('Deleted disposable media is gone', 'GET', '{{baseUrl}}/media/{{artistUnassociatedProfileMediaId}}', {
    token: 'artistJwt',
    tests: [...status(404), "pm.test('Deleted media not found', () => pm.expect(pm.response.json().code).to.eql('MEDIA_NOT_FOUND'));"],
  }),
]);

function completionRequests(label, token, persona, timestampVariable) {
  return [
    item(`${label} - Complete onboarding`, 'POST', '{{baseUrl}}/onboarding/complete', {
      token,
      tests: [
        ...status(200),
        'const json = pm.response.json();',
        `pm.test('Persona is ${persona}', () => pm.expect(json.persona).to.eql('${persona}'));`,
        "pm.test('Completion succeeds', () => pm.expect(json.status).to.eql('COMPLETED'));",
        "pm.test('Completion timestamp returned', () => pm.expect(json.onboardingCompletedAt).to.be.a('string'));",
        `pm.environment.set('${timestampVariable}', json.onboardingCompletedAt);`,
      ],
    }),
    item(`${label} - Retry completion idempotently`, 'POST', '{{baseUrl}}/onboarding/complete', {
      token,
      tests: [
        ...status(200),
        'const json = pm.response.json();',
        "pm.test('Retry remains COMPLETED', () => pm.expect(json.status).to.eql('COMPLETED'));",
        `pm.test('Timestamp unchanged', () => pm.expect(json.onboardingCompletedAt).to.eql(pm.environment.get('${timestampVariable}')));`,
      ],
    }),
    item(`${label} - GET onboarding after completion`, 'GET', '{{baseUrl}}/onboarding', {
      token,
      tests: [
        ...status(200),
        'const json = pm.response.json();',
        "pm.test('Completed state returned', () => pm.expect(json.status).to.eql('COMPLETED'));",
        "pm.test('Draft internals not returned', () => pm.expect(json.steps).to.eql([]));",
      ],
    }),
  ];
}

function selfAccountRequest(label, token, persona, idVariable, emailVariable, mediaIdVariable) {
  return item(`${label} - GET authenticated self account`, 'GET', '{{baseUrl}}/me', {
    token,
    tests: [
      ...status(200),
      'const json = pm.response.json();',
      `pm.test('Self persona is ${persona}', () => pm.expect(json.persona).to.eql('${persona}'));`,
      `pm.test('Self identity is canonical', () => { pm.expect(json.id).to.eql(pm.environment.get('${idVariable}')); pm.expect(json.email).to.eql(pm.environment.get('${emailVariable}')); pm.expect(json.displayName).to.be.a('string').and.not.empty; });`,
      `pm.test('Self onboarding state is complete', () => { pm.expect(json.onboardingStatus).to.eql('COMPLETE'); pm.expect(json.onboardingCompletedAt).to.be.a('string'); pm.expect(json.onboardingVersion).to.eql(2); });`,
      `pm.test('Self canonical media returned', () => { pm.expect(json.profileImage.mediaId).to.eql(pm.environment.get('${mediaIdVariable}')); pm.expect(json.profileImage.url).to.match(/^http/); pm.expect(json.profileImage).not.to.have.property('objectKey'); pm.expect(json.profileImage).not.to.have.property('ownerId'); });`,
      "pm.test('Self contract omits credentials and drafts', () => { ['password','onboardingDrafts','dataJson','profileImageUrl','logoUrl'].forEach(field => pm.expect(json).not.to.have.property(field)); });",
    ],
  });
}

const completionFolder = folder('09 - Completion / Idempotency', [
  ...completionRequests('Artist', 'artistJwt', 'MUSICIAN', 'artistCompletedAt'),
  ...completionRequests('Venue', 'venueJwt', 'VENUE', 'venueCompletedAt'),
  ...completionRequests('Promoter', 'promoterJwt', 'PROMOTER', 'promoterCompletedAt'),
  selfAccountRequest('Artist', 'artistJwt', 'MUSICIAN', 'artistId', 'artistEmail', 'artistProfileMediaId'),
  selfAccountRequest('Venue', 'venueJwt', 'VENUE', 'venueId', 'venueEmail', 'venueProfileMediaId'),
  selfAccountRequest('Promoter', 'promoterJwt', 'PROMOTER', 'promoterId', 'promoterEmail', 'promoterProfileMediaId'),
  item('Verify safe Musician search DTO', 'GET', '{{baseUrl}}/musicians/search?genre=INDIE', {
    tests: [
      ...status(200),
      'const json = pm.response.json(); const artist = json.find(candidate => candidate.id === pm.environment.get(\'artistId\'));',
      "pm.test('Artist appears in search', () => pm.expect(artist).to.be.an('object'));",
      "pm.test('Musician search is private-by-default', () => { ['email','password','minimumFee','willingToTravel','websiteUrl','instagramHandle'].forEach(field => pm.expect(artist).not.to.have.property(field)); pm.expect(artist.location).to.be.an('object'); pm.expect(artist.location).not.to.have.property('addressLine1'); pm.expect(artist.profileImage).not.to.have.property('objectKey'); });",
    ],
  }),
  item('Verify safe Venue search DTO', 'GET', '{{baseUrl}}/venues/search?genre=INDIE&liveMusic=true', {
    tests: [
      ...status(200),
      'const json = pm.response.json(); const venue = json.find(candidate => candidate.id === pm.environment.get(\'venueId\'));',
      "pm.test('Venue appears in search', () => pm.expect(venue).to.be.an('object'));",
      "pm.test('Venue search is private-by-default', () => { ['email','password','bookingEmail','typicalBudget','liveMusic','websiteUrl'].forEach(field => pm.expect(venue).not.to.have.property(field)); pm.expect(venue.location).to.be.an('object'); pm.expect(venue.profileImage).not.to.have.property('objectKey'); });",
    ],
  }),
  item('Verify safe ordered Venue match DTO', 'GET', '{{baseUrl}}/musicians/{{artistId}}/matches', {
    tests: [
      ...status(200),
      'const json = pm.response.json(); const venue = json.find(candidate => candidate.id === pm.environment.get(\'venueId\'));',
      "pm.test('Matching Venue appears', () => { pm.expect(venue).to.be.an('object'); pm.expect(venue.matchScore).to.match(/^\\d+\\/\\d+ genres matched$/); });",
      "pm.test('Venue match is private-by-default', () => { ['email','password','bookingEmail','typicalBudget','liveMusic'].forEach(field => pm.expect(venue).not.to.have.property(field)); pm.expect(venue.location).to.be.an('object'); pm.expect(venue.profileImage).not.to.have.property('objectKey'); });",
    ],
  }),
  item('Verify safe public Artist profile and canonical media', 'GET', '{{baseUrl}}/musicians/{{artistId}}', {
    tests: [
      ...status(200),
      'const json = pm.response.json();',
      "pm.test('Artist canonical fields promoted', () => { pm.expect(json.bio).to.eql('Brooklyn post-punk band.'); pm.expect(json.location.displayName).to.eql('Brooklyn, NY'); pm.expect(json.genres).to.eql(['INDIE','PUNK']); pm.expect(json.vibes).to.eql(['RAW','ENERGETIC']); pm.expect(json.eventTypes).to.eql(['CONCERT','SHOWCASE']); });",
      "pm.test('Artist public profile is private-by-default', () => { ['email','password','minimumFee','willingToTravel','profileImageUrl','onboardingStatus','onboardingVersion','onboardingCompletedAt','createdAt','updatedAt'].forEach(field => pm.expect(json).not.to.have.property(field)); pm.expect(json.location).not.to.have.property('addressLine1'); });",
      "pm.test('Artist canonical public media returned', () => { pm.expect(json.profileImage.mediaId).to.eql(pm.environment.get('artistProfileMediaId')); pm.expect(json.profileImage.url).to.match(/^http/); pm.expect(json.profileImage.mimeType).to.eql('image/jpeg'); pm.expect(json.profileImage).not.to.have.property('objectKey'); pm.expect(json.profileImage).not.to.have.property('ownerId'); });",
    ],
  }),
  item('Verify safe public Venue profile and canonical media', 'GET', '{{baseUrl}}/venues/{{venueId}}', {
    tests: [
      ...status(200),
      'const json = pm.response.json();',
      "pm.test('Venue canonical fields promoted', () => { pm.expect(json.description).to.eql('Independent live room in Brooklyn.'); pm.expect(json.location.displayName).to.eql('123 Bedford Ave, Brooklyn, NY'); pm.expect(json.location.addressLine1).to.eql('123 Bedford Ave'); pm.expect(json.capacity).to.eql(250); pm.expect(json.genrePreferences).to.eql(['INDIE','ROCK']); pm.expect(json.ambience).to.eql(['INTIMATE','RAW']); });",
      "pm.test('Venue public profile is private-by-default', () => { ['email','password','bookingEmail','typicalBudget','liveMusic','logoUrl','onboardingStatus','onboardingVersion','onboardingCompletedAt','createdAt','updatedAt'].forEach(field => pm.expect(json).not.to.have.property(field)); });",
      "pm.test('Venue canonical public media returned', () => { pm.expect(json.profileImage.mediaId).to.eql(pm.environment.get('venueProfileMediaId')); pm.expect(json.profileImage.url).to.match(/^http/); pm.expect(json.profileImage).not.to.have.property('objectKey'); pm.expect(json.profileImage).not.to.have.property('ownerId'); });",
    ],
  }),
  item('Verify safe public Promoter profile', 'GET', '{{baseUrl}}/promoters/{{promoterId}}', {
    tests: [
      ...status(200),
      'const json = pm.response.json();',
      "pm.test('Promoter canonical fields promoted', () => { pm.expect(json.businessName).to.eql('E2E Night Signal Presents'); pm.expect(json.bio).to.eql('Independent NYC show promoter.'); pm.expect(json.location.displayName).to.eql('New York, NY'); pm.expect(json.genreSpecialties).to.eql(['INDIE','PUNK']); pm.expect(json.vibePreferences).to.eql(['RAW','ENERGETIC']); });",
      "pm.test('Promoter public profile is private-by-default', () => { ['email','phone','password','acceptingNewArtists','currentRosterSize','logoUrl','onboardingStatus','onboardingVersion','onboardingCompletedAt','createdAt','updatedAt'].forEach(field => pm.expect(json).not.to.have.property(field)); pm.expect(json.location).not.to.have.property('addressLine1'); });",
      "pm.test('Promoter canonical public media returned', () => { pm.expect(json.profileImage.mediaId).to.eql(pm.environment.get('promoterProfileMediaId')); pm.expect(json.profileImage.url).to.match(/^http/); pm.expect(json.profileImage).not.to.have.property('objectKey'); pm.expect(json.profileImage).not.to.have.property('ownerId'); });",
    ],
  }),
], 'Completes each READY persona twice, verifies stable timestamps, safe public profile allowlists, and canonical public media. Full graph verification is documented in folder 10 and BACKEND_E2E_TESTING.md.');

const neo4jGuide = folder('10 - Neo4j Verification Guide', [], `Manual, read-only verification queries (run in Neo4j Browser or cypher-shell):

Artist node:
MATCH (m:Musician {id: $artistId}) RETURN m;

Artist completed draft and retained steps, including completed optional media:
MATCH (m:Musician {id: $artistId})-[:HAS_ONBOARDING_DRAFT]->(d:OnboardingDraft)
OPTIONAL MATCH (d)-[:HAS_STEP]->(s:OnboardingStep)
RETURN d, s ORDER BY s.position;

Canonical profile media cardinality:
MATCH (m:Musician {id: $artistId})-[:HAS_MEDIA]->(media:MediaAsset)
WHERE media.mediaType = 'PROFILE_IMAGE'
RETURN count(media) AS profileImageCount, collect(media) AS media;

Replace Musician with Venue/$venueId or Promoter/$promoterId for the other personas. The current onboarding schema version is 2. Confirm COMPLETE persona/draft state, retained optional-media dataJson, READY profile media, exactly one canonical profile relationship, preserved legacy sentinels, and no presigned URL properties. The local cleanup script accepts the exported e2eRunId and deletes only that run.`);

const collection = {
  info: {
    _postman_id: 'b0a91048-40f5-4ea8-88ab-3f22b477c7c4',
    name: 'MVPConnect Backend E2E',
    description: 'Repeatable local smoke/integration coverage for Spring Boot, JWT, Neo4j, MinIO media, typed onboarding, ownership, promotion, and idempotency. Run folders in numeric order from the repository root.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  item: [
    folder('00 - Health / Setup', [initializeRun, livenessCheck, readinessCheck], 'Run this first on every collection execution. It generates unique account emails, clears stale IDs/tokens, and verifies standard liveness/readiness groups.'),
    authFolder,
    folder('02 - Media', mediaFolderItems, 'Uses the committed 34,954-byte JPEG fixture. Direct MinIO PUT requests deliberately carry no JWT.'),
    artistFolder,
    venueFolder,
    promoterFolder,
    resumeFolder,
    negativeFolder,
    securityFolder,
    completionFolder,
    neo4jGuide,
  ],
};

const environmentValues = [
  ['baseUrl', 'http://localhost:8080'],
  ['testPassword', 'LocalOnly!234'],
  ['fixtureRelativePath', 'mvpconnect-app/assets/matches/glass-houses.jpg'],
  ['fixtureSizeBytes', '34954'],
  ['fixtureWidth', '600'],
  ['fixtureHeight', '300'],
  ['e2eRunId', ''],
  ['artistJwt', ''], ['venueJwt', ''], ['promoterJwt', ''], ['resumeArtistJwt', ''],
  ['artistId', ''], ['venueId', ''], ['promoterId', ''], ['resumeArtistId', ''],
  ['artistEmail', ''], ['venueEmail', ''], ['promoterEmail', ''], ['resumeArtistEmail', ''],
  ['artistProfileMediaId', ''], ['venueProfileMediaId', ''], ['promoterProfileMediaId', ''],
  ['artistBannerMediaId', ''], ['venueBannerMediaId', ''], ['venueGalleryMediaId', ''], ['promoterBannerMediaId', ''],
  ['artistUnassociatedProfileMediaId', ''], ['artistPendingMediaId', ''],
  ['resumeArtistProfileMediaId', ''],
  ['artistProfileUploadUrl', ''], ['venueProfileUploadUrl', ''], ['promoterProfileUploadUrl', ''],
  ['artistBannerUploadUrl', ''], ['venueBannerUploadUrl', ''], ['venueGalleryUploadUrl', ''],
  ['promoterBannerUploadUrl', ''], ['artistUnassociatedProfileUploadUrl', ''],
  ['artistPendingUploadUrl', ''], ['resumeArtistProfileUploadUrl', ''],
  ['artistCompletedAt', ''], ['venueCompletedAt', ''], ['promoterCompletedAt', ''],
].map(([key, value]) => ({ key, value, enabled: true, type: 'default' }));

const environment = {
  id: '153db4cb-882b-46d0-9af4-0b9b7a7cf9bc',
  name: 'MVPConnect Local',
  values: environmentValues,
  _postman_variable_scope: 'environment',
  _postman_exported_at: new Date(0).toISOString(),
  _postman_exported_using: 'MVPConnect repository generator',
};

fs.writeFileSync(collectionPath, `${JSON.stringify(collection, null, 2)}\n`);
fs.writeFileSync(environmentPath, `${JSON.stringify(environment, null, 2)}\n`);
