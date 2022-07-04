
import fs from "fs";

import { IOR, OnceMode, ServerSideUcpComponentDescriptorInterface } from "ior:esm:/tla.EAM.Once[build]";

import path from "path";
import { BasePersistanceManager } from "../1_infrastructure/BasePersistanceManager.class.mjs";
import { UDEObject } from "../3_services/PersistanceManager.interface.mjs";
import { UcpModelChangelog } from "../3_services/UcpModel.interface.mjs";
import UDELoader from "./UDELoader.class.mjs";

// let glob = require("glob");

import glob from "glob";

export class FilePersistanceManager extends BasePersistanceManager {

    get backendActive(): boolean {
        return this.backendVersion !== undefined;
    }

    static readonly fileEnding: string = '.scenario.json';

    private backendVersion: string | undefined = undefined;

    static readonly _aliasSeparator: string = ".";

    static canHandle(ior: IOR): number {
        if (ONCE && (ONCE.mode === OnceMode.NODE_JS || ONCE.mode === OnceMode.NODE_LOADER)) {
            if ((ior.hostName === 'localhost' || ior.hostName == undefined) && ior.id) {
                return 1;
            }
        }
        return 0;
    }

    canHandle(ior: IOR): number {
        return FilePersistanceManager.canHandle(ior);
    }

    get IOR(): IOR & { id: string } | undefined {
        let ior = this.ucpComponent?.IOR;
        if (ior && typeof ior.id === 'undefined') throw new Error("Missing ID");
        return ior as IOR & { id: string } | undefined;
    }

    get udeDirectory(): string {
        if (this.ucpComponent === undefined) throw new Error("Missing ucpComponent");
        let udeDir = path.join(ONCE.oldEamd.scenario.eamdPath, ONCE.oldEamd.scenario.webRoot, (this.ucpComponent.classDescriptor.ucpComponentDescriptor as ServerSideUcpComponentDescriptorInterface).scenarioDirectory);
        if (!fs.existsSync(udeDir)) fs.mkdirSync(udeDir);
        return udeDir;
    }

    fileName(ior?: IOR & { id: string }): string {
        if (!ior) ior = this.IOR;
        if (!ior) throw new Error("Missing IOR");


        let id = ior.id;
        let aliasList = this.alias.sort(function (a, b) {
            a = a.toLowerCase();
            b = b.toLowerCase();
            if (a == b) return 0;
            if (a > b) return 1;
            return -1;
        });

        let fileName: string = '';
        if (aliasList.length > 0) fileName += aliasList.join(FilePersistanceManager._aliasSeparator) + FilePersistanceManager._aliasSeparator;
        fileName += id + FilePersistanceManager.fileEnding;
        return fileName;

    }

    filePath(ior?: IOR & { id: string }): string {
        return path.join(this.udeDirectory, this.fileName(ior));
    }

    static async discover(): Promise<{ [index: string]: string }> {
        // if (ior.pathName === undefined) throw new Error("Missing PathName in ior");
        const fullAliasList: { [index: string]: string } = {};

        for (const file of glob.sync(ONCE.oldEamd.scenario.webRoot + '/**/*' + this.fileEnding)) {
            let fileName = file.split('/').pop();
            if (fileName) {

                const aliasList = fileName.substring(0, fileName.length - this.fileEnding.length).split(FilePersistanceManager._aliasSeparator);
                for (const alias of aliasList) {
                    if (fullAliasList[alias] === undefined) {
                        fullAliasList[alias] = file;
                    } else {
                        console.error(`Duplicate UDE Alias! File1: ${file} / ${fullAliasList[alias]}`)
                    }
                }

            }
        }


        return fullAliasList;
    }

    static async findFile4IOR(ior: IOR & { id: string }): Promise<string | undefined> {
        const id = ior.id;
        const aliasList = await this.discover();
        if (aliasList[id]) {
            return aliasList[id];
        }
    }

    async addAlias(alias: string): Promise<void> {
        if (this.backendActive) {
            await this.delete();
            this.alias.push(alias);
            await this.create();
        } else {
            this.alias.push(alias);
        }
    }

    async removeAlias(alias: string): Promise<void> {
        if (this.backendActive) {
            await this.delete();
            this.alias.splice(this.alias.indexOf(alias), 1);
            await this.create();
        } else {
            this.alias.splice(this.alias.indexOf(alias), 1);
        }
    }

    async create(): Promise<void> {
        if (!this.ucpComponent || !this.IOR) throw new Error("Missing UCP Component");

        await this._validateAliasList();

        let fileName = await this.filePath();

        if (fs.existsSync(fileName)) {
            throw new Error(`File '${fileName}' already exists`);
        }

        let data = this.ucpComponentData;

        fs.writeFileSync(fileName, JSON.stringify(data, null, 2));
        UDELoader.factory().addObject2Store(this.IOR, this.ucpComponent)
        this.backendVersion = data.particle.version;

    }

    private async _validateAliasList(): Promise<void> {
        const ior = this.IOR;
        if (!ior) throw new Error("Missing IOR");

        let aliasList = await FilePersistanceManager.discover();

        for (let alias of [...this.alias, ior.id]) {
            if (alias) {
                if (aliasList[alias]) {
                    throw new Error(`Alias ${alias} already exists in File ${aliasList[alias]}! New IOR: ${ior.href}`);
                }
            }
        }

    }


    async retrieve(ior?: IOR & { id: string }): Promise<UDEObject> {
        let internalIOR = ior || this.IOR;
        if (!internalIOR) throw new Error("Missing IOR");

        let filepath = await FilePersistanceManager.findFile4IOR(internalIOR);
        if (!filepath) throw new Error("No file Found");

        const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));

        const udeObject = UDELoader.validateUDEStructure(data);
        await this.retrieveFromData(data);

        return udeObject;
    }

    async retrieveFromData(udeObject: UDEObject): Promise<UDEObject> {
        if (this.ucpComponent) {
            this.ucpComponent.model = udeObject.particle.data;
            this.backendVersion = udeObject.particle.version;
            if (udeObject.alias) this.alias = udeObject.alias;
        }
        return udeObject;
    }



    async update(): Promise<void> {

        if (!this.backendActive) throw new Error("Object is not persisted");

        let fileName = this.filePath();

        if (!fs.existsSync(fileName)) {
            throw new Error(`File '${fileName}' dose not exist`);
        }

        let data = this.ucpComponentData

        fs.writeFileSync(fileName, JSON.stringify(data, null, 2));
    }

    async delete(): Promise<void> {
        if (!this.backendActive) return;

        if (!this.ucpComponent || !this.IOR) throw new Error("Missing UCP Component");

        let fileName = await this.filePath();
        fs.rmSync(fileName);
        UDELoader.factory().removeObjectFromStore(this.IOR);
        this.backendVersion = undefined;
    }



    async onModelChanged(changeObject: UcpModelChangelog): Promise<void> {
        if (this.backendVersion) {
            await this.update();
        }
    }
    onNotification(changeObject: UcpModelChangelog): Promise<void> {
        throw new Error("Method not implemented.");
    }


}

