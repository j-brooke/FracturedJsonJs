import {add} from "../src/calc";

describe("test add fn", () => {
    it("should add numbers", () => {
        expect(add(10,5)).toBe(15);
    })

    it("should return 5", () => {
        expect(add(2,3)).toBe(5);
    })
})
