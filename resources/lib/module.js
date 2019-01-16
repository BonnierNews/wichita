window.count = window.count || 0;

export default function module() {
  window.setByModule = true;
  window.count++;
  window.broker.assertExchange("event", "topic");
}
