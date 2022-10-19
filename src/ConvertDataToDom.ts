import {JsonItem} from "./JsonItem";
import {JsonItemType} from "./JsonItemType";
import {FracturedJsonError} from "./FracturedJsonError";

/**
 * Converts from JavaScript data (objects, strings, etc) to FracturedJson's DOM, to allow it to be formatted.
 */
export function ConvertDataToDom(element:any, propName?: string, recursionLimit:number = 100): JsonItem | undefined {
    if (recursionLimit <= 0)
        throw new FracturedJsonError("Depth limit exceeded - possible circular reference");

    const elementType = typeof element;
    switch (elementType) {
        case "function":
        case "symbol":
        case "undefined":
            return undefined;
    }

    // If whatever it is has a custom "toJSON" method (like the built-in Date class), let the native JSON code
    // figure it all out.  toJSON could, in theory, give the string representation of a complex object or null or
    // who knows what, so we need to parse it out again before dealing with it.
    if (element && element["toJSON"]) {
        const convertedElement = JSON.parse(JSON.stringify(element));
        return ConvertDataToDom(convertedElement, undefined, recursionLimit-1);
    }

    // Let native JSON deal with escapes and such in the prop names.
    const item = new JsonItem();
    item.Name = (propName)? JSON.stringify(propName) : "";

    if (element === null) {
        item.Type = JsonItemType.Null;
        item.Value = "null";
    }
    else if (Array.isArray(element)) {
        // In arrays, undefined (including anything that can't be converted) are treated as null and take up space
        // in the array.
        item.Type = JsonItemType.Array;
        item.Children = (element as any[]).map(ch =>
            ConvertDataToDom(ch, undefined, recursionLimit-1)
            ?? ConvertDataToDom(null, undefined, recursionLimit-1)!);
    }
    else if (elementType == "object") {
        // In objects, undefined values (including anything that can't be converted) are omitted.
        item.Type = JsonItemType.Object;
        for (const kvp of Object.entries(element)) {
            const childItem = ConvertDataToDom(kvp[1], kvp[0], recursionLimit-1);
            if (childItem)
                item.Children.push(childItem);
        }
    }
    else {
        switch (elementType) {
            case "string":
                item.Type = JsonItemType.String;
                break;
            case "number":
            case "bigint":
                item.Type = JsonItemType.Number;
                break;
            case "boolean":
                item.Type = (element)? JsonItemType.True : JsonItemType.False;
                break;
        }

        item.Value = JSON.stringify(element);
    }

    if (item.Children.length > 0) {
        const highestChildComplexity = item.Children.map(ch => ch.Complexity)
            .reduce((p:number, v:number) => Math.max(p, v));
        item.Complexity = highestChildComplexity + 1;
    }

    return item;
}
