import foreach from "./commands/foreach.ts";
import define from "./commands/iterable/define.ts";
import deleteIterable from "./commands/iterable/delete.ts";
import list from "./commands/iterable/list.ts";
import show from "./commands/iterable/show.ts";

export default [define, deleteIterable, list, show, foreach];
