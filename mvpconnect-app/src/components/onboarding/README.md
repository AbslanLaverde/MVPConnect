# Onboarding component foundation

These components are the shared vocabulary for Artist, Venue, and Promoter onboarding. They are composable React controls with explicit persona-specific integration.

## Integration boundaries

- `LocationField` always reads and writes a structured `LocationValue`. Artist and Promoter city fields and Venue address fields use the authenticated Google Places backend proxy when it is configured; manual entry remains available when it is not.
- `MediaUploader` supports profile, banner, and gallery image modes plus empty, selected, uploading, uploaded, and error states. A selection is labeled as not uploaded unless a `MediaUploadAdapter` is supplied. [Onboarding media adapters](../../onboarding/onboardingMedia.ts) connect the picker, presigned upload, and step-association lifecycle.
- `ImageGalleryUploader` requires an explicit maximum and provides compact multi-select intake, ordered presentation, retry, and removal. Onboarding supplies the persona limit: 8 gallery images for Artists and 10 for Venues and Promoters.
- `SocialConnectionField` is a controlled display/action shell. It does not implement OAuth or assume that Spotify, YouTube, and Instagram expose identical metadata.
- `AISuggestionReview` never treats an AI suggestion as accepted until the user explicitly accepts it.
- `UrlField` does not normalize by default. Set `normalizeOnBlur` to add `https://` only to domain-shaped values that omit a scheme; the normalized value is returned through `onChange`.

## Future showcase intent

- Spotify connections may later identify an artist's music presence and support compliant track or album showcases.
- YouTube connections may later support selected videos or playlists.
- Instagram connections remain provider-specific identity/content signals.
- Image and social contracts are intended to support showcase-oriented Artist, Venue, and Promoter profiles without implementing those profile pages here.
