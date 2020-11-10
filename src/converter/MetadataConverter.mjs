import {AbstractConverter} from "@ozelot379/convert-base-api";
import {DeleteConverter} from "./DeleteConverter.mjs";
import v4 from "uuid/v4.js";

/**
 * Class MetadataConverter
 */
class MetadataConverter extends AbstractConverter {
    /**
     * @inheritDoc
     */
    async convert() {
        const [from, to, uuid_header_file, uuid_module_file] = this.data;

        const to_delete = [];

        this.log.log(`Create metadata ${to}`);

        if (!await this.output.exists(from)) {
            throw new Error(`Missing ${from}! Is this really a Java texture pack?`);
        }

        let uuid_header = "";
        if (await this.output.exists(uuid_header_file)) {
            uuid_header = (await this.output.read(uuid_header_file)).toString("utf8");

            to_delete.push(new DeleteConverter(uuid_header_file));
        } else {
            uuid_header = v4();
        }

        let uuid_module = "";
        if (await this.output.exists(uuid_module_file)) {
            uuid_module = (await this.output.read(uuid_module_file)).toString("utf8");

            to_delete.push(new DeleteConverter(uuid_module_file));
        } else {
            uuid_module = v4();
        }

        this.constructor.mcmeta = JSON.parse((await this.output.read(from)).toString("utf8").trim()); // trim it to supports UF8 files with 'BOOM' at the beginning

        if (this.constructor.mcmeta.pack.pack_format !== 4 && this.constructor.mcmeta.pack.pack_format !== 5 && this.constructor.mcmeta.pack.pack_format !== 6) {
            throw new Error("Only supports pack_format 4 (v1.13 or v1.14) or 5 (v1.15 or v1.16) or 6 (>= v1.16.2)!");
        }

        const name = await this.input.getName();

        let description = this.constructor.mcmeta.pack.description;
        if (description) {
            if (Array.isArray(description)) {
                description = description.map(line => {
                    let text;

                    if (line) {
                        if (line instanceof Object) {
                            text = Object.entries(this.constructor.FORMAT_CODES_MAP).reduce((text, [key, value]) => {
                                if (line[key] || line.color === key) {
                                    text = `${value}${text}`;
                                }

                                return text;
                            }, line.text);
                        } else {
                            text = line.toString();
                        }
                    } else {
                        text = "";
                    }

                    return text;
                }).join("");
            } else {
                description = description.toString();
            }
        } else {
            description = "";
        }

        const manifest = {
            format_version: 2,
            header: {
                description,
                min_engine_version: [1, 16, 20],
                name,
                uuid: uuid_header,
                version: [0, 0, 1]
            },
            modules: [
                {
                    description,
                    type: "resources",
                    uuid: uuid_module,
                    version: [0, 0, 1]
                }
            ]
        };

        await this.writeJson(to, manifest);

        to_delete.push(new DeleteConverter(from));

        return to_delete;
    }

    /**
     * @inheritDoc
     */
    static get DEFAULT_CONVERTER_DATA() {
        return [
            ["pack.mcmeta", "manifest.json", "bedrock_uuid_header", "bedrock_uuid_module"]
        ];
    }

    static get FORMAT_CODES_MAP() {
        // https://minecraft.gamepedia.com/Formatting_codes#Color_codes
        return {
            black: "§0",
            dark_blue: "§1",
            dark_green: "§2",
            dark_aqua: "§3",
            dark_red: "§4",
            dark_purple: "§5",
            gold: "§6",
            gray: "§7",
            dark_gray: "§8",
            blue: "§9",
            green: "§a",
            aqua: "§b",
            red: "§c",
            light_purple: "§d",
            yellow: "§e",
            white: "§f",
            minecoin_gold: "§g",
            obfuscated: "§k",
            bold: "§l",
            strikethrough: "§m",
            underline: "§n",
            italic: "§o",
            reset: "§r"
        };
    }
}

/**
 * @type {Object|null}
 */
MetadataConverter.mcmeta = null;

export {MetadataConverter};
