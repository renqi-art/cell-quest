(() => {
  'use strict';

  const isIdentifierStart = character => /[A-Za-z_$]/.test(character || '');
  const isIdentifierPart = character => /[A-Za-z0-9_$]/.test(character || '');

  function skipIgnored(source, startIndex) {
    let index = startIndex;
    while (index < source.length) {
      if (/\s/.test(source[index])) {
        index += 1;
        continue;
      }
      if (source[index] === '/' && source[index + 1] === '/') {
        index += 2;
        while (index < source.length && source[index] !== '\n' && source[index] !== '\r') {
          index += 1;
        }
        continue;
      }
      if (source[index] === '/' && source[index + 1] === '*') {
        const commentEnd = source.indexOf('*/', index + 2);
        if (commentEnd < 0) throw new SyntaxError('Unterminated comment');
        index = commentEnd + 2;
        continue;
      }
      break;
    }
    return index;
  }

  function skipQuotedString(source, startIndex) {
    const quote = source[startIndex];
    let index = startIndex + 1;
    while (index < source.length) {
      if (source[index] === '\\') {
        index += 2;
        continue;
      }
      if (source[index] === quote) return index + 1;
      index += 1;
    }
    return source.length;
  }

  function findPropertyValueStart(source, propertyName) {
    let index = 0;
    while (index < source.length) {
      index = skipIgnored(source, index);
      const character = source[index];
      if (character === '"' || character === "'") {
        index = skipQuotedString(source, index);
        continue;
      }
      if (!isIdentifierStart(character)) {
        index += 1;
        continue;
      }

      const nameStart = index;
      index += 1;
      while (isIdentifierPart(source[index])) index += 1;
      const name = source.slice(nameStart, index);
      const colonIndex = skipIgnored(source, index);
      if (name === propertyName && source[colonIndex] === ':') {
        return skipIgnored(source, colonIndex + 1);
      }
      index = colonIndex;
    }
    return -1;
  }

  class LiteralParser {
    constructor(source, startIndex) {
      this.source = source;
      this.index = startIndex;
    }

    skipIgnored() {
      this.index = skipIgnored(this.source, this.index);
    }

    parseValue() {
      this.skipIgnored();
      const character = this.source[this.index];
      if (character === '[') return this.parseArray();
      if (character === '{') return this.parseObject();
      if (character === '"' || character === "'") return this.parseString();
      if (character === '-' || character === '.' || /[0-9]/.test(character || '')) {
        return this.parseNumber();
      }
      if (isIdentifierStart(character)) return this.parseKeyword();
      throw new SyntaxError('Expected a literal value');
    }

    parseArray() {
      const value = [];
      this.index += 1;
      this.skipIgnored();
      if (this.source[this.index] === ']') {
        this.index += 1;
        return value;
      }

      while (this.index < this.source.length) {
        value.push(this.parseValue());
        this.skipIgnored();
        if (this.source[this.index] === ']') {
          this.index += 1;
          return value;
        }
        if (this.source[this.index] !== ',') throw new SyntaxError('Expected an array comma');
        this.index += 1;
        this.skipIgnored();
        if (this.source[this.index] === ']') {
          this.index += 1;
          return value;
        }
      }
      throw new SyntaxError('Unterminated array');
    }

    parseObject() {
      const value = {};
      this.index += 1;
      this.skipIgnored();
      if (this.source[this.index] === '}') {
        this.index += 1;
        return value;
      }

      while (this.index < this.source.length) {
        this.skipIgnored();
        let key;
        if (this.source[this.index] === '"' || this.source[this.index] === "'") {
          key = this.parseString();
        } else {
          const keyStart = this.index;
          if (!isIdentifierStart(this.source[this.index])) {
            throw new SyntaxError('Expected an object key');
          }
          this.index += 1;
          while (isIdentifierPart(this.source[this.index])) this.index += 1;
          key = this.source.slice(keyStart, this.index);
        }
        if (key === '__proto__' || key === 'prototype' || key === 'constructor') {
          throw new SyntaxError('Unsafe object key');
        }

        this.skipIgnored();
        if (this.source[this.index] !== ':') throw new SyntaxError('Expected an object colon');
        this.index += 1;
        value[key] = this.parseValue();
        this.skipIgnored();
        if (this.source[this.index] === '}') {
          this.index += 1;
          return value;
        }
        if (this.source[this.index] !== ',') throw new SyntaxError('Expected an object comma');
        this.index += 1;
        this.skipIgnored();
        if (this.source[this.index] === '}') {
          this.index += 1;
          return value;
        }
      }
      throw new SyntaxError('Unterminated object');
    }

    parseString() {
      const quote = this.source[this.index];
      let value = '';
      this.index += 1;
      while (this.index < this.source.length) {
        const character = this.source[this.index];
        if (character === quote) {
          this.index += 1;
          return value;
        }
        if (character === '\n' || character === '\r') {
          throw new SyntaxError('Unescaped newline in string');
        }
        if (character !== '\\') {
          value += character;
          this.index += 1;
          continue;
        }

        this.index += 1;
        if (this.index >= this.source.length) throw new SyntaxError('Unterminated escape');
        const escape = this.source[this.index];
        const escapes = {
          b: '\b',
          f: '\f',
          n: '\n',
          r: '\r',
          t: '\t',
          v: '\v',
          '0': '\0',
        };
        if (Object.hasOwn(escapes, escape)) {
          if (escape === '0' && /[0-9]/.test(this.source[this.index + 1] || '')) {
            throw new SyntaxError('Legacy octal escapes are not supported');
          }
          value += escapes[escape];
          this.index += 1;
          continue;
        }
        if (escape === '\n') {
          this.index += 1;
          continue;
        }
        if (escape === '\r') {
          this.index += 1;
          if (this.source[this.index] === '\n') this.index += 1;
          continue;
        }
        if (escape === 'x') {
          const hex = this.source.slice(this.index + 1, this.index + 3);
          if (!/^[0-9a-fA-F]{2}$/.test(hex)) throw new SyntaxError('Invalid hex escape');
          value += String.fromCharCode(Number.parseInt(hex, 16));
          this.index += 3;
          continue;
        }
        if (escape === 'u') {
          if (this.source[this.index + 1] === '{') {
            const codePointEnd = this.source.indexOf('}', this.index + 2);
            const hex = this.source.slice(this.index + 2, codePointEnd);
            if (codePointEnd < 0 || !/^[0-9a-fA-F]{1,6}$/.test(hex)) {
              throw new SyntaxError('Invalid Unicode escape');
            }
            const codePoint = Number.parseInt(hex, 16);
            if (codePoint > 0x10ffff) throw new SyntaxError('Invalid Unicode code point');
            value += String.fromCodePoint(codePoint);
            this.index = codePointEnd + 1;
            continue;
          }
          const hex = this.source.slice(this.index + 1, this.index + 5);
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) throw new SyntaxError('Invalid Unicode escape');
          value += String.fromCharCode(Number.parseInt(hex, 16));
          this.index += 5;
          continue;
        }

        value += escape;
        this.index += 1;
      }
      throw new SyntaxError('Unterminated string');
    }

    parseNumber() {
      const match = this.source.slice(this.index).match(
        /^-?(?:(?:\d+\.\d*|\.\d+|\d+)(?:[eE][+-]?\d+)?)/,
      );
      if (!match) throw new SyntaxError('Invalid number');
      const value = Number(match[0]);
      if (!Number.isFinite(value)) throw new SyntaxError('Number must be finite');
      this.index += match[0].length;
      return value;
    }

    parseKeyword() {
      const start = this.index;
      this.index += 1;
      while (isIdentifierPart(this.source[this.index])) this.index += 1;
      const keyword = this.source.slice(start, this.index);
      if (keyword === 'true') return true;
      if (keyword === 'false') return false;
      if (keyword === 'null') return null;
      throw new SyntaxError('Executable expressions are not supported');
    }
  }

  function parseArrayProperty(sourceValue, propertyName) {
    const source = String(sourceValue);
    try {
      const valueStart = findPropertyValueStart(source, propertyName);
      if (valueStart < 0) return null;
      const parser = new LiteralParser(source, valueStart);
      const value = parser.parseValue();
      parser.skipIgnored();
      const boundary = source[parser.index];
      if (!Array.isArray(value) || (boundary !== ',' && boundary !== '}')) return null;
      return value;
    } catch {
      return null;
    }
  }

  globalThis.ClassicLiteralParser = Object.freeze({ parseArrayProperty });
})();
