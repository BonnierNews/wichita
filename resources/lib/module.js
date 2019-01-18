window.count = window.count || 0;

export default function module(arg1) {
  window.setByModule = true;
  window.count++;
  window.arg1 = arg1;
  window.broker.assertExchange("event", "topic");
  return arg1;
}

export function justReturn(arg) {
  return arg;
}
