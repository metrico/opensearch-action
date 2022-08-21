"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = exports.getCommaSeparatedInput = void 0;
const core = __importStar(require("@actions/core"));
const process = __importStar(require("process"));
const gh = __importStar(require("./github"));
const logs = __importStar(require("./logs"));
const defaultIndex = "logs-generic-default";
// Split comma separated inputs into an array of trimmed values
function getCommaSeparatedInput(value) {
    let retVal = [];
    if (value !== "") {
        retVal = value.split(",");
        // trim array items
        retVal = retVal.map((s) => s.trim());
    }
    return retVal;
}
exports.getCommaSeparatedInput = getCommaSeparatedInput;
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // retrieve config params
            // Github repo token
            const repoToken = core.getInput("repo-token", { required: true });
            // List of jobs to collect logs from (all jobs when empty)
            const jobNames = core.getInput("job-names", { required: false }) || "";
            const allowList = getCommaSeparatedInput(jobNames);
            // Elastic Cloud ID
            const cloudId = core.getInput("cloud-id", { required: false }) || "";
            // Elasticsearch addresses (when Cloud ID is not present)
            const addrValue = core.getInput("addresses", { required: false }) || "";
            const addresses = getCommaSeparatedInput(addrValue);
            // Elasticsearch index
            const indexName = core.getInput("index-name", { required: false }) || defaultIndex;
            // Elasticsearch user
            const username = core.getInput("username", { required: false });
            // Elasticsearch pass
            const password = core.getInput("password", { required: false });
            // Ensure either Cloud ID or ES addresses are set
            if (cloudId === "" && addresses.length === 0) {
                throw new Error("invalid configuration: please set either cloud-id or addresses");
            }
            // get an authenticated HTTP client for the GitHub API
            const client = gh.getClient(repoToken);
            // get all the jobs for the current workflow
            const workflowId = process.env["GITHUB_RUN_ID"] || "";
            const repo = process.env["GITHUB_REPOSITORY"] || "";
            core.debug(`Allow listing ${allowList.length} jobs in repo ${repo}`);
            const jobs = yield gh.fetchJobs(client, repo, workflowId, allowList);
            // get a configured ES client
            const esClient = logs.getESClient(cloudId, addresses, username, password);
            // get the logs for each job
            core.debug(`Getting logs for ${jobs.length} jobs`);
            for (const j of jobs) {
                const lines = yield gh.fetchLogs(client, repo, j);
                core.debug(`Fetched ${lines.length} lines for job ${j.name}`);
                const tmpfile = `./out-${j.id}.log`;
                // convert logs to ECS and dump to disk
                logs.convert(lines, tmpfile);
                // bulk send to ES
                const result = yield logs.bulkSend(esClient, indexName, tmpfile);
                core.debug(`Bulk request results: ${result}`);
            }
        }
        catch (e) {
            core.setFailed(`Run failed: ${e}`);
        }
    });
}
exports.run = run;
