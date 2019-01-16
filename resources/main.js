import module from "./lib/module";
import {queue} from "./lib/queue";
import {Broker} from "smqp";

window.broker = Broker();

module();

(function IIFE() {
  queue();
})();
