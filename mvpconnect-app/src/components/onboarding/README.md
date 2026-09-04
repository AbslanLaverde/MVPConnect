# Onboarding component foundation

These components are the shared vocabulary for future persona onboarding steps. They are deliberately composable React controls, not a schema-driven form engine.

## Integration boundaries

- `LocationField` always reads and writes a structured `LocationValue`. Artist and Promoter city fields and Venue address fields use the authenticated Google Places backend proxy when it is configured; manual entry remains available when it is not.
- `MediaUploader` supports profile, banner, and gallery image modes plus empty, local, uploading, uploaded, and error states. A local selection is labeled as not uploaded unless a `MediaUploadAdapter` is supplied. No production media transport, object storage, presigned upload, native picker, or camera integration is included.
- `ImageGalleryUploader` composes `MediaUploader`, requires an explicit maximum, and exposes reorder/remove behavior without selecting a final product limit.
- `SocialConnectionField` is a controlled display/action shell. It does not implement OAuth or assume that Spotify, YouTube, Instagram, and TikTok expose identical metadata.
- `AISuggestionReview` never treats an AI suggestion as accepted until the user explicitly accepts it.
- `UrlField` does not normalize by default. Set `normalizeOnBlur` to add `https://` only to domain-shaped values that omit a scheme; the normalized value is returned through `onChange`.

## Future showcase intent

- Spotify connections may later identify an artist's music presence and support compliant track or album showcases.
- YouTube connections may later support selected videos or playlists.
- Instagram and TikTok connections remain provider-specific identity/content signals.
- Image and social contracts are intended to support showcase-oriented Artist, Venue, and Promoter profiles without implementing those profile pages here.
