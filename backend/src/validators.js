function validatePostInput(input = {}) {
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  const content = typeof input.content === 'string' ? input.content.trim() : '';
  const category = typeof input.category === 'string' && input.category.trim() ? input.category.trim() : 'General';
  if (!title || title.length > 180) return { valid: false, error: 'Title is required and must be at most 180 characters' };
  if (!content) return { valid: false, error: 'Content is required' };
  return { valid: true, value: { title, content, category } };
}
module.exports = { validatePostInput };
