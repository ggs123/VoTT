import _ from "lodash";
import { ExportProvider } from "./exportProvider";
import { IProject, IExportProviderOptions } from "../../models/applicationState";
import Guard from "../../common/guard";
import { constants } from "../../common/constants";
import HtmlFileReader from "../../common/htmlFileReader";

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

        if (this.options.includeImages) {
            await results.forEachAsync(async (assetMetadata) => {

                await assetMetadata.regions.forEachAsync(async (region) => {
                    const arrayBuffer = await HtmlFileReader.getRegionArray(assetMetadata.asset,region);
                    //filename->asset.name
                    if(region.tags.length<2){
                        region.tags[0]="peopleMistagged";
                        region.tags[1]="actionMistagged";
                    }
                    const regionFileName = region.tags[0] + "_" + region.tags[1] + "_" + assetMetadata.asset.timestamp.toString + "_" + region.id + ".jpg";
                    const assetFilePath = `vott-json-export/${regionFileName}`;
                    await this.storageProvider.writeBinary(assetFilePath, Buffer.from(arrayBuffer));
                });

            });
        }


        //original code
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
