import module from "./lib/module";
import {queue} from "./lib/queue";
import {Broker} from "smqp";
import {render} from "@bonniernews/md2html";

window.broker = Broker();

module();

(function IIFE() {
  queue();

  render("## lol");
})();
