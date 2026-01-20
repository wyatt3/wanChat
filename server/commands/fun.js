// Fun commands: /fart, /light

function fart(ctx) {
  ctx.handler.broadcast(`${ctx.username} let one rip! 💨`);
  ctx.io.emit('fart', { username: ctx.username });
  return true;
}

function light(ctx) {
  ctx.handler.broadcast(`${ctx.username} lights up a cigarette 🚬 *puff* *puff*`);
  ctx.io.emit('light', { username: ctx.username });
  return true;
}

module.exports = {
  fart,
  light
};
