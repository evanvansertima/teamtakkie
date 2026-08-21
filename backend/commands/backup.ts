import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdir, readdir, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'

const execFileAsync = promisify(execFile)

// How many backups to keep around locally. This is not itself an off-box
// backup — it protects against "I broke the database" and buys time to
// copy a file elsewhere, but a disk failure on this host still loses
// everything. Off-box shipping (rclone to B2 or similar) is a later step
// once real hosting is chosen; for now this is what "node ace backup"
// nightly via cron gives you.
const BEWAAR_AANTAL = 14

export default class Backup extends BaseCommand {
  static commandName = 'backup'
  static description = 'Maakt een backup van de database en geuploade bestanden'

  static options: CommandOptions = { startApp: true }

  async run() {
    const backupDir = app.tmpPath('backups')
    await mkdir(backupDir, { recursive: true })

    const stagingDir = app.tmpPath('backup-staging')
    await mkdir(stagingDir, { recursive: true })

    const stempel = new Date().toISOString().replace(/[:.]/g, '-')
    const bestandsnaam = `fc-harlingen-${stempel}.tar.gz`
    const doelPad = join(backupDir, bestandsnaam)

    try {
      this.logger.info('Database wegschrijven naar een consistente snapshot…')
      const snapshotPad = join(stagingDir, 'db.sqlite3')
      // VACUUM INTO takes SQLite's own online-backup path rather than a
      // plain file copy, so a write happening at the same moment can't
      // produce a torn/corrupt snapshot.
      await db.rawQuery('VACUUM INTO ?', [snapshotPad])

      const args = ['-czf', doelPad, '-C', stagingDir, 'db.sqlite3']
      const uploadsPad = app.tmpPath('uploads')
      if (await this.bestaat(uploadsPad)) {
        args.push('-C', app.tmpPath(), 'uploads')
      }

      this.logger.info('Bestanden inpakken…')
      await execFileAsync('tar', args)
    } finally {
      await rm(stagingDir, { recursive: true, force: true })
    }

    const grootte = (await stat(doelPad)).size
    this.logger.success(`Backup gemaakt: ${bestandsnaam} (${(grootte / 1048576).toFixed(1)} MB)`)

    await this.oudeBackupsOpruimen(backupDir)
  }

  private async bestaat(pad: string) {
    try {
      await stat(pad)
      return true
    } catch {
      return false
    }
  }

  private async oudeBackupsOpruimen(backupDir: string) {
    const bestanden = (await readdir(backupDir)).filter((f) => f.endsWith('.tar.gz')).sort()
    const teVeel = bestanden.length - BEWAAR_AANTAL
    if (teVeel <= 0) return
    for (const bestand of bestanden.slice(0, teVeel)) {
      await rm(join(backupDir, bestand))
      this.logger.info(`Oude backup verwijderd: ${bestand}`)
    }
  }
}
