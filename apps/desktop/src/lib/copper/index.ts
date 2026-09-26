import * as backlinks from "@/lib/copper/backlinks";
import * as events from "@/lib/copper/events";
import * as files from "@/lib/copper/files";
import * as git from "@/lib/copper/git";
import * as properties from "@/lib/copper/properties";
import * as search from "@/lib/copper/search";
import * as settings from "@/lib/copper/settings";
import * as system from "@/lib/copper/system";
import * as tasks from "@/lib/copper/tasks";
import * as updates from "@/lib/copper/updates";
import * as vaults from "@/lib/copper/vaults";

export const copper = {
  system,
  vaults,
  files,
  git,
  events,
  search,
  properties,
  backlinks,
  settings,
  tasks,
  updates,
};
