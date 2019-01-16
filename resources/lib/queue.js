import {Queue} from "smqp/src/Queue";

export {queue};

function queue() {
  window.setByQueue = true;
  return Queue("test-q");
}
