export const defaultAdapter = {
  name: 'default',

  async beforeDetect(page, { logger }) {
    logger.debug('Using default adapter for', page.url());
  },

  async afterFill(page, { logger, results }) {
    const filledCount = results.filter((result) => result.status === 'filled').length;
    logger.info(`Autofill complete. Filled ${filledCount} field(s).`);
  }
};
