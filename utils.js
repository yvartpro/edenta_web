export const API_BASE_URL = 'https://capbio.bi/edenta/api';
export const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('fr-FR', options);
};

export const resolveFileUrl = (fileData) => {
  if (!fileData) return null;

  // If it's already a full URL string
  if (typeof fileData === 'string' && fileData.startsWith('http')) {
    return fileData;
  }

  // If it's an object with a url property (from API heroImage or contentFiles)
  if (typeof fileData === 'object' && fileData.url) {
    return fileData.url;
  }

  // If it's a numeric ID or a short string ID, use the file endpoint
  return `${API_BASE_URL}/file/${fileData}`;
};

export const parseContent = (content) => {
  if (typeof content === 'string') {
    try {
      content = JSON.parse(content);
    } catch (e) {
      return content;
    }
  }
  return content;
};
