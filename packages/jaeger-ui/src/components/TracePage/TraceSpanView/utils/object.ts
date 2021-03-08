// copied then trimmed from https://raw.githubusercontent.com/auth0/auth0.js/master/src/helper/object.js

/* eslint-disable no-param-reassign */
/* eslint-disable no-restricted-syntax */
/* eslint-disable guard-for-in */

function camelToSnake(str: string) {
  let newKey = ''
  let index = 0
  let code
  let wasPrevNumber = true
  let wasPrevUppercase = true

  while (index < str.length) {
    code = str.charCodeAt(index)
    if ((!wasPrevUppercase && code >= 65 && code <= 90) || (!wasPrevNumber && code >= 48 && code <= 57)) {
      newKey += '_'
      newKey += str[index].toLowerCase()
    } else {
      newKey += str[index].toLowerCase()
    }
    wasPrevNumber = code >= 48 && code <= 57
    wasPrevUppercase = code >= 65 && code <= 90
    index++
  }

  return newKey
}

function snakeToCamel(str: string) {
  const parts = str.split('_')
  return parts.reduce((p, c) => p + c.charAt(0).toUpperCase() + c.slice(1), parts.shift()!)
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function toSnakeCase(object: any, exceptions: string[] = []): any {
  if (typeof object !== 'object' || object === null) {
    return object
  }

  return Object.keys(object).reduce((p: { [key: string]: any }, key: string) => {
    const newKey = exceptions.indexOf(key) === -1 ? camelToSnake(key) : key
    p[newKey] = toSnakeCase(object[key])
    return p
  }, {})
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function toCamelCase(object: any, exceptions: string[] = []): any {
  if (typeof object !== 'object' || object === null) {
    return object
  }

  return Object.keys(object).reduce((p: { [key: string]: any }, key: string) => {
    const newKey = exceptions.indexOf(key) === -1 ? snakeToCamel(key) : key
    p[newKey] = toCamelCase(object[key])
    return p
  }, {})
}

export function camelToWords(str: string): string {
  let newKey = ''
  let index = 0
  let code
  let wasPrevNumber = true
  let wasPrevUppercase = true

  while (index < str.length) {
    code = str.charCodeAt(index)
    if (index === 0) {
      newKey += str[index].toUpperCase()
    } else if ((!wasPrevUppercase && code >= 65 && code <= 90) || (!wasPrevNumber && code >= 48 && code <= 57)) {
      newKey += ' '
      newKey += str[index].toUpperCase()
    } else {
      newKey += str[index].toLowerCase()
    }
    wasPrevNumber = code >= 48 && code <= 57
    wasPrevUppercase = code >= 65 && code <= 90
    index++
  }

  return newKey
}
