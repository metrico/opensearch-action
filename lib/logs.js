"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkSend = exports.getESClient = exports.convert = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
const ecs_pino_format_1 = __importDefault(require("@elastic/ecs-pino-format"));
const fs_1 = require("fs");
const pino_1 = __importDefault(require("pino"));
const split2_1 = __importDefault(require("split2"));
const opensearch_1 = require("@opensearch-project/opensearch");
function convert(lines, destPath) {
    return __awaiter(this, void 0, void 0, function* () {
        const log = (0, pino_1.default)((0, ecs_pino_format_1.default)(), pino_1.default.destination(destPath));
        for (const l of lines) {
            log.info(l);
        }
    });
}
exports.convert = convert;
function getESClient(cloudId, addresses, user, pass) {
    const config = {};
    if (user !== "") {
        config["auth"] = {
            username: user,
            password: pass,
        };
    }
    if (cloudId !== "") {
        config["cloud"] = {
            id: cloudId,
        };
    }
    else {
        config["node"] = addresses;
    }
    return new opensearch_1.Client(config);
}
exports.getESClient = getESClient;
function bulkSend(client, indexName, path) {
    return __awaiter(this, void 0, void 0, function* () {
        return client.helpers.bulk({
            datasource: (0, fs_1.createReadStream)(path).pipe((0, split2_1.default)()),
            onDocument(doc) {
                return {
                    create: { _index: indexName },
                };
            },
        });
    });
}
exports.bulkSend = bulkSend;
