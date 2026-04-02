const extractDriveFileId = (value) => {
  const input = String(value || '').trim();
  if (!input) return '';

  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /\/uc\?(?:[^#]*&)?id=([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match?.[1]) return match[1];
  }

  return '';
};

export const toEmbeddableGoogleDriveUrl = (value) => {
  const input = String(value || '').trim();
  if (!input) return '';

  const fileId = extractDriveFileId(input);
  if (!fileId) return input;

  return `https://drive.google.com/uc?export=view&id=${fileId}`;
};
