export function loadLegacyObject<T>(source: string, objectName: string): T {
  return Function(`${source}\nreturn ${objectName};`)() as T
}
