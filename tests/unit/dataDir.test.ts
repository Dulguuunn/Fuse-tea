import { describe, expect, it } from 'vitest'
import { resolveDataDir } from '../../src/main/dataDir'

const base = {
  env: {},
  isPackaged: false,
  execPath: 'C:\\Note\\node_modules\\electron\\dist\\electron.exe',
  appPath: 'C:\\Note'
}

describe('resolveDataDir', () => {
  it('uses NOTES_DATA_DIR when set', () => {
    expect(resolveDataDir({ ...base, isPackaged: true, env: { NOTES_DATA_DIR: 'D:\\tmp\\x' } })).toBe('D:\\tmp\\x')
  })
  it('ignores an empty NOTES_DATA_DIR', () => {
    expect(resolveDataDir({ ...base, env: { NOTES_DATA_DIR: '' } })).toBe('C:\\Note\\data')
  })
  it('packaged: data folder two levels above the exe', () => {
    expect(
      resolveDataDir({ ...base, isPackaged: true, execPath: 'C:\\Note\\release\\win-unpacked\\Notes.exe' })
    ).toBe('C:\\Note\\data')
  })
  it('dev: data folder in the project root', () => {
    expect(resolveDataDir(base)).toBe('C:\\Note\\data')
  })
})
