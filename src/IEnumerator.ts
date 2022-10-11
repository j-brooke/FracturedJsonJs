export interface IEnumerator<T> {
    Current: T;
    MoveNext(): boolean;
}
