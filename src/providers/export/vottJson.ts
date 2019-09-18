import _ from "lodash";
import { ExportProvider } from "./exportProvider";
import { IProject, IExportProviderOptions } from "../../models/applicationState";
import Guard from "../../common/guard";
import { constants } from "../../common/constants";
import HtmlFileReader from "../../common/htmlFileReader";
import { IAssetMetadata} from "../../models/applicationState";
import { number } from "prop-types";

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
        results.sort(compare);
        console.log(results)
        const tagRecord : Map<string,Map<string,any>> = new Map<string,Map<string,any>>();
        const nameRecord : Map<string,string> = new Map();
        const folderRecord : Map<string,string> = new Map();
        

        if (this.options.includeImages) {

            results.forEach( (assetMetadata) => {

                assetMetadata.regions.forEach( (region) => {
                    
                    if(region.tags.length<2){
                        region.tags=["error1","error2"];
                    }

                    const currTagInfoMap = tagRecord.get(region.tags.join("_"));

                    if( currTagInfoMap && (getName(assetMetadata.asset.name) - currTagInfoMap.get("end") == 1)){

                        //continuous tag1_tag2 : renew end, regions
                        currTagInfoMap.set("end",getName(assetMetadata.asset.name));
                        currTagInfoMap.set("curr", currTagInfoMap.get("curr") + 1 );
                        currTagInfoMap.get("regions").set(region.id, currTagInfoMap.get("curr"))

                    }else{
                        //currTagInfoMap doesn't exist or continuity ends
                        
                        if( currTagInfoMap ){
                            //continuous tag1_tag2 ends : push regions into folderRecord
                            const regionsToPush = currTagInfoMap.get("regions");
                            const folderName = region.tags.join("_") + "_" + Math.random().toString(36).substr(2)
                            for(var [id,count] of regionsToPush){
                                const fileName =  count + "_" + id + ".jpg"
                                nameRecord.set(id,fileName);
                                folderRecord.set(id, folderName)
                            }
                        }
                        
                        const tagKey = region.tags.join("_");
                        const tagValue = new Map<string,any>();
                        tagValue.set("start", getName(assetMetadata.asset.name));
                        tagValue.set("end", getName(assetMetadata.asset.name));
                        tagValue.set("curr", 0)
                        tagValue.set("regions", new Map().set(region.id,0) );
                        tagRecord.set(tagKey,tagValue);

                    }


                });

            });


            tagRecord.forEach(function(value, key) {
                
                const regionsToPush = value.get("regions")
                const folderName = key + "_" + Math.random().toString(36).substr(2)
                for(var [id,count] of regionsToPush){
                    const fileName = count + "_" + id + ".jpg"
                    nameRecord.set(id,fileName)
                    folderRecord.set(id, folderName)
                }
            
            }) 


            await results.forEachAsync(async (assetMetadata) => {

                await assetMetadata.regions.forEachAsync(async (region) => {

                    const arrayBuffer = await HtmlFileReader.getRegionArray(assetMetadata.asset,region);
                    const regionFolderName = folderRecord.get(region.id)
                    const regionFileName = nameRecord.get(region.id);
                    const assetFilePath = `vott-json-export/${regionFolderName}/${regionFileName}`;
                    await this.storageProvider.writeTertiary(assetFilePath, Buffer.from(arrayBuffer));

                });

            });

        }  


        function compare (a:IAssetMetadata, b:IAssetMetadata){
            if(getName(a.asset.name)<getName(b.asset.name)){
                return -1;
            }else if(getName(a.asset.name)>getName(b.asset.name)){
                return 1;
            }else return 0;
        }

        function getName (name:string){
            const num = name.split('-')[1].split('.')[0]
            return Number(num)
        }

        
         


        //original code by VoTT
        /* 
        const results = await this.getAssetsForExport(); 
        
        if (this.options.includeImages) {
            await results.forEachAsync(async (assetMetadata) => {
                const arrayBuffer = await HtmlFileReader.getAssetArray(assetMetadata.asset);
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
