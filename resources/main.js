import module from "./lib/module";
import {queue} from "./lib/queue";
import {Broker} from "smqp";
import {render} from "@bonniernews/md2html";

import importer1 from "./lib/importer1";
import importer2 from "./lib/importer2";

window.broker = new Broker();

module();
importer1();
importer2();

(function IIFE() {
  queue();

  render("## lol");
})();
