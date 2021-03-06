#!/usr/bin/env node

"use strict";
const fs = require("fs");
const path = require("path");
const { appVersion, conciseCatcher, JsShell, AppErr } =
  require("@admc.com/apputil");
const { validate } = require("@admc.com/bycontract-plus");

const yargs = require("yargs")(process.argv.slice(2)).
  strictOptions().
  usage(`SYNTAX: $0 [-dEhOqrv] /src/jre/root hsqldb/root newjre.name cmd.json
Command files are JSON of lists of objects with these elements:
    label:       string      OPTIONAL
    cmd:         [An argv list]  REQUIRED
    cwd:         directory       OPTIONAL
    require0:    boolean     OPTIONAL  (require 0 exit values)
    stdOut:      boolean     OPTIONAL  (display stdout)
    stdErr:      boolean     OPTIONAL  (display stderr)
    condition:   string      OPTIONAL  (JS code that evaluates to true or false)
    interactive: boolean     OPTIONAL  (allow interactive input)`.
      replace(/ /g, "\u2009")).
  option("v", { describe: "Verbose", type: "boolean", }).
  option("d", { describe: "Debug logging", type: "boolean", }).
  option("q", {
      describe: "Quiet logging by logging only at level WARN and ERROR",
      type: "boolean",
  }).
  option("r", {
      describe: "Rebuild by delete pre-existing build directory",
      type: "boolean",
  }).
  option("E", {
      describe: "hide standard Error from commands (default true)",
      type: "boolean",
  }).
  option("O", {
      describe: "hide standard Output from commands (default true)",
      type: "boolean",
  }).
  alias("help", "h").
  demandCommand(4,4).
  version(appVersion);
const yargsDict = yargs.argv;
const progName = yargsDict.$0.replace(/^.*[\\/]/, "");

if (!yargsDict.d) console.debug = () => {};
if (yargsDict.q) console.debug = console.log = console.info = () => {};
const cmdFilePath = yargsDict._.pop();
const newJreName = yargsDict._.pop();

conciseCatcher(function(cmdFile, srcJmods, hsqldbPath, newJre, out, err) {
    validate(arguments,
      ["string", "string", "string", "string", "boolean=", "boolean="]);
    if (!/\Sjre.\S/.test(newJreName))
        throw new AppErr(`New JRE name '${newJreName}' not of form *?jre.?*`);
    if (!("JAVA_HOME" in process.env))
        throw new AppErr("You must set env var JAVA_HOME to your JDK root");
    if (!fs.existsSync(process.env.JAVA_HOME + "/bin/jlink")
      || !fs.statSync(process.env.JAVA_HOME + "/bin/jlink").isFile())
        throw new AppErr("jlink not accessible at "
          + process.env.JAVA_HOME + "/bin/jlink");
    try {
      fs.accessSync(process.env.JAVA_HOME + "/bin/jlink", fs.constants.X_OK);
    } catch(e0) {
        throw new AppErr("jlink not executable at "
          + process.env.JAVA_HOME + "/bin/jlink");
    }
    if (!fs.existsSync(process.env.JAVA_HOME + "/bin/java")
      || !fs.statSync(process.env.JAVA_HOME + "/bin/java").isFile())
        throw new AppErr("java not accessible at "
          + process.env.JAVA_HOME + "/bin/java");
    if (!fs.existsSync(srcJmods) || !fs.statSync(srcJmods).isDirectory())
        throw new AppErr("jmods not accessible at " + srcJmods);
    if (!fs.existsSync(hsqldbPath + "/lib")
      || !fs.statSync(hsqldbPath + "/lib").isDirectory())
        throw new AppErr("lib not accessible at " + hsqldbPath + "/lib");
    try {
      fs.accessSync(process.env.JAVA_HOME + "/bin/java", fs.constants.X_OK);
    } catch(e1) {
        throw new AppErr("java not executable at "
          + process.env.JAVA_HOME + "/bin/java");
    }
    if (fs.existsSync(newJreName) && yargsDict.r)
        fs.rmSync(newJreName, {force: true, recursive: true});
    if (fs.existsSync(newJreName))
        throw new AppErr(`JRE target directory '${newJreName}`
          + "already exists.  Try -r switch");
    console.warn(
      `Building '${newJreName}' with JDK '${process.env.JAVA_HOME}'`);
    const jsShell =
      new JsShell(cmdFile, JSON.parse(fs.readFileSync(cmdFile, "utf8")),
        undefined, undefined, undefined, {
            JAVA_HOME: process.env.JAVA_HOME,
            HSQLDB_ROOT: hsqldbPath,
            TARGET_JRE_NAME: newJre,
            SRC_JRE_JMODS: srcJmods,
            THIS_PLATFORM: require("os").platform(),
        });
    console.debug(jsShell.id + " command file validated successfully");
    console.info("%s took %s s.", jsShell.id,
      (jsShell.run(true, out, err).lastExecDuration/1000).toFixed(3));
})(cmdFilePath, yargsDict._.shift(), yargsDict._.shift(), newJreName,
  !yargsDict.O, !yargsDict.E);
