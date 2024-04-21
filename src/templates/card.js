module.exports = {

  preprocess({ card }) {
    if (card.type === undefined) {
      if (card.field !== undefined) {
        card.type = 'process';
      } else {
        card.type = 'default';
      }
    }
    card.size ||= 'normal';
  },

  classes({ card }, { namespace }) {
    return {
      type: card.type,
      size: card.size,
      space: namespace,
    };
  },

};