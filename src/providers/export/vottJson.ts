import _ from "lodash";
import { ExportProvider } from "./exportProvider";
import { IProject, IExportProviderOptions } from "../../models/applicationState";
import Guard from "../../common/guard";
import { constants } from "../../common/constants";
import HtmlFileReader from "../../common/htmlFileReader";
//import { IAssetMetadata } from "vott-react";
import { string } from "prop-types";
import { IAssetMetadata } from "../../models/applicationState";
import fs from "fs";

/**
 * VoTT Json Export Provider options
 */
export interface IVottJsonExportProviderOptions extends IExportProviderOptions {
    /** Whether or not to include binary assets in target connection */
    includeImages: boolean;
}

/**
 * @name - Vott Json Export Provider
 * @description - Exports a project into a single JSON file that include all configured assets
 */
export class VottJsonExportProvider extends ExportProvider<IVottJsonExportProviderOptions> {
    constructor(project: IProject, options: IVottJsonExportProviderOptions) {
        super(project, options);
        Guard.null(options);
    }

    /**
     * Export project to VoTT JSON format
     */
     public async export(): Promise<void> {

        const results = await this.getAssetsForExport(); 

        //simplified: all picture in one folder

        if (this.options.includeImages) {
            await results.forEachAsync(async (assetMetadata) => {

                await assetMetadata.regions.forEachAsync(async (region) => {
                    const arrayBuffer = await HtmlFileReader.getRegionArray(assetMetadata.asset,region);
                    //filename->asset.name
                    if(region.tags.length<2){
                        region.tags[0]="ErrorTag1";
                        region.tags[1]="ErrorTag2";
                    }

                    //save in new folder
                    //const firstFolderName = region.tags[0] + "_" + region.tags[1] + "_" + assetMetadata.asset.timestamp;
                    const firstRegionFileName = region.tags[0] + "_" + region.tags[1] + "_" + assetMetadata.asset.timestamp + "_" + region.id + ".jpg";
                    const firstAssetFilePath = `vott-json-export/${firstRegionFileName}`;
                    await this.storageProvider.writeBinary(firstAssetFilePath, Buffer.from(arrayBuffer));
                });

            });
        } 


    //complete: pictures categorized by folders
    //bug: regions in first frame appeared in "undefined" folder

     /*
        if (this.options.includeImages) {


            var regFolderName : string;
            var regionFolderName : string;
            var regionFileName : string;
            var assetFilePath : string;
            var folderBuffer = new Map();
            var regionFolders = new Map(); 


            await results.forEachAsync(async (assetMetadata) => {

                regionFolders.clear;
                const frameIdx = results.indexOf(assetMetadata);

                await assetMetadata.regions.forEachAsync(async (region) => {

                    const arrayBuffer = await HtmlFileReader.getRegionArray(assetMetadata.asset,region);
                    
                    if(region.tags.length<2){
                        region.tags[0]="ErrorTag1";
                        region.tags[1]="ErrorTag2";
                    }

                    if(frameIdx !== 0){

                        const reg = results[frameIdx-1].regions.find( (r) => r.tags[0]===region.tags[0] );
                        //a region in previous frame has same Tag[0] 
                        if(reg){

                            //also has the same Tag[1]
                            if(reg.tags[1] === region.tags[1]){

                                //save in reg folder
                                regFolderName = folderBuffer[reg.id];
                                regionFileName = region.tags[0] + "_" + region.tags[1] + "_" + assetMetadata.asset.timestamp + "_" + region.id + ".jpg";
                                assetFilePath = `vott-json-export/${regFolderName}/${regionFileName}`;
                                regionFolders[region.id] = regFolderName;
                                await this.storageProvider.writeTertiary(assetFilePath, Buffer.from(arrayBuffer));
                                
                                //if last frame
                                if( frameIdx === (results.length-1) ){
                                    //rename reg folder: add reg endtime
                                    const newRegFolderName = regFolderName + "_" + results[frameIdx-1].asset.timestamp;
            
                                    await this.storageProvider.renameFolder(`vott-json-export/${regFolderName}`,
                                        `vott-json-export/${newRegFolderName}`); 
                                    
                                }

                            }else{
                                //Tag[1] not the same
                                //rename reg folder: add reg endtime
                                regFolderName = folderBuffer[reg.id];
                                const newRegFolderName = regFolderName + "_" + results[frameIdx-1].asset.timestamp;
                                
                                //await this.storageProvider.renameFolder(`vott-json-export/${regFolderName}`,
                                    //`vott-json-export/${newRegFolderName}`);  

                                
                                //save in new folder
                
                                if( frameIdx !== (results.length-1) ){
                                    regionFolderName = region.tags[0] + "_" + region.tags[1] + "_" + assetMetadata.asset.timestamp;
                                }else{
                                    //if last frame, add endtime
                                    regionFolderName = region.tags[0] + "_" + region.tags[1] + "_" + assetMetadata.asset.timestamp + "_" + assetMetadata.asset.timestamp;
                                }
                                regionFileName = region.tags[0] + "_" + region.tags[1] + "_" + assetMetadata.asset.timestamp + "_" + region.id + ".jpg";
                                assetFilePath = `vott-json-export/${regionFolderName}/${regionFileName}`;
                                regionFolders[region.id] = regionFolderName;
                                await this.storageProvider.writeTertiary(assetFilePath, Buffer.from(arrayBuffer));
                                
                            }
                            
                        }else{
                            //no region in previous frame has same Tag[0]
                            //save in new folder
                            if( frameIdx !== (results.length-1) ){
                                regionFolderName = region.tags[0] + "_" + region.tags[1] + "_" + assetMetadata.asset.timestamp;
                            }else{
                                //if last frame, add endtime
                                regionFolderName = region.tags[0] + "_" + region.tags[1] + "_" + assetMetadata.asset.timestamp + "_" + assetMetadata.asset.timestamp;
                            }
                            regionFileName = region.tags[0] + "_" + region.tags[1] + "_" + assetMetadata.asset.timestamp + "_" + region.id + ".jpg";
                            assetFilePath = `vott-json-export/${regionFolderName}/${regionFileName}`;
                            regionFolders[region.id] = regionFolderName;
                            await this.storageProvider.writeTertiary(assetFilePath, Buffer.from(arrayBuffer));
                        }
                        
                    //first frame
                    }else{
                        //save in new folder
                        const firstFolderName = region.tags[0] + "_" + region.tags[1] + "_" + assetMetadata.asset.timestamp;
                        const firstRegionFileName = region.tags[0] + "_" + region.tags[1] + "_" + assetMetadata.asset.timestamp + "_" + region.id + ".jpg";
                        const firstAssetFilePath = `vott-json-export/${firstFolderName}/${firstRegionFileName}`;
                        regionFolders[region.id] = firstFolderName;
                        await this.storageProvider.writeTertiary(firstAssetFilePath, Buffer.from(arrayBuffer));
                    }

                });

                //before new frame: renew folderBuffer with previous folderpaths

                folderBuffer = regionFolders;

            });
        } */

         


        //original code by VoTT
        /* if (this.options.includeImages) {
            await results.forEachAsync(async (assetMetadata) => {
                const arrayBuffer = await HtmlFileReader.getAssetArray(assetMetadata.asset);
                //add const pathName -> people_action_timestamp
                const assetFilePath = `vott-json-export/${assetMetadata.asset.name}`;
                await this.storageProvider.writeBinary(assetFilePath, Buffer.from(arrayBuffer));
            });
        } */


        const exportObject = { ...this.project };
        exportObject.assets = _.keyBy(results, (assetMetadata) => assetMetadata.asset.id) as any;

        // We don't need these fields in the export JSON
        delete exportObject.sourceConnection;
        delete exportObject.targetConnection;
        delete exportObject.exportFormat;

        const fileName = `vott-json-export/${this.project.name.replace(/\s/g, "-")}${constants.exportFileExtension}`;
        await this.storageProvider.writeText(fileName, JSON.stringify(exportObject, null, 4));
    }
}
