// Card utilities for blackjack

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return shuffle(deck);
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function cardValue(card) {
  if (['J', 'Q', 'K'].includes(card.rank)) return 10;
  if (card.rank === 'A') return 11; // Handled specially in handValue
  return parseInt(card.rank);
}

function handValue(cards) {
  let total = 0;
  let aces = 0;

  for (const card of cards) {
    if (card.rank === 'A') {
      aces++;
      total += 11;
    } else {
      total += cardValue(card);
    }
  }

  // Convert aces from 11 to 1 as needed
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  return total;
}

function isBlackjack(cards) {
  return cards.length === 2 && handValue(cards) === 21;
}

function isBusted(cards) {
  return handValue(cards) > 21;
}

function canSplit(cards) {
  if (cards.length !== 2) return false;
  // Can split if both cards have same value (10s, Js, Qs, Ks all count as 10)
  const val1 = cardValue(cards[0]);
  const val2 = cardValue(cards[1]);
  return val1 === val2;
}

function formatCard(card) {
  const isRed = card.suit === '♥' || card.suit === '♦';
  return {
    display: `${card.rank}${card.suit}`,
    rank: card.rank,
    suit: card.suit,
    isRed
  };
}

function formatHand(cards) {
  return cards.map(formatCard);
}

module.exports = {
  createDeck,
  shuffle,
  cardValue,
  handValue,
  isBlackjack,
  isBusted,
  canSplit,
  formatCard,
  formatHand,
  SUITS,
  RANKS
};
