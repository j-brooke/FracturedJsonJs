import {InputPosition} from "./InputPosition";

export function FracturedJsonException(message: string, pos: InputPosition): Error {
    const text = `${message} at idx=${pos.Index}, row=${pos.Row}, col=${pos.Column}`;
    return new Error(text);
}
