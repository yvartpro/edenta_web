export const API_BASE_URL = 'http://localhost:4000/edenta/api';
export const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('fr-FR', options);
};

export const resolveFileUrl = (fileIdOrUrl) => {
  if (!fileIdOrUrl) return null;
  if (typeof fileIdOrUrl === 'string' && fileIdOrUrl.startsWith('http')) return fileIdOrUrl;
  return `${API_BASE_URL}/file/${fileIdOrUrl}`;
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
