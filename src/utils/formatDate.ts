const formatter = new Intl.DateTimeFormat('en', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

export const formatDate = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return formatter.format(date);
};
