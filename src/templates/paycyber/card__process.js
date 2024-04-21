module.exports = {

  preprocess({ card }) {
    const field = [];

    for (const row of card.field) {
      for (const cell of row) {
        if (cell === '1') {
          field.push('fill');
        } else {
          field.push('empty');
        }
      }
    }

    card.field = field;
  },

};