const chokidar = require('chokidar')
const path = require('node:path')
const util = require('node:util')
const exec = util.promisify(require('node:child_process').exec);
const fs = require('fs')

const log_file = fs.createWriteStream(__dirname + '/debug.log', {flags : 'w'});
const log = (msg) => {
  const ts = new Date().toLocaleString()
  log_file.write('[' + ts + '] ' + util.format(msg) + '\n');
}

const watcher = chokidar.watch('../../drop', {
  awaitWriteFinish: true,
  usePolling: true,
  interval: 5000,
})

watcher.on('add', async (p) => {
  const date = new Date()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const f = path.parse(p)
  const ext = f.ext.toLowerCase()
  const name = f.name
  const fn = f.base
  const tmp = '../../tmp'
  const tmpfile = `${tmp}/${month}${year}${fn}`
  const tmpfilenoext = `${tmp}/${name}`
  
  await exec(`mv ${p} ${tmpfile}`)

  if (ext === '.png') {
    await exec(`pngquant --strip -f ${tmpfile} -o ${tmpfile}`)
      .catch(err => { if (err) log('error: '+err)})
      .finally(log(`-- optimized ${tmpfile}`))

    await exec(`convert ${tmpfile} -resize 600x600\\> ${tmpfile}`)
      .catch(err => { if (err) log('error: '+err)})
      .finally(log(`-- resized ${tmpfile}`))

    await exec(`mv ${tmpfile} /usr/share/nginx/blckmtn/images`)
      .catch(err => { if (err) log('error: '+err)})
      .finally(log(`-- moved ${tmpfile} to /usr/share/nginx/blckmtn/images/${fn}`))

  } else if (ext === '.wav') {

    const outmp3 = `${tmpfilenoext}.mp3`
    const outogg = `${tmpfilenoext}.ogg`

    await exec(`lame ${tmpfile} ${outmp3}`)
      .catch(err => { if (err) log('error: '+err)})
      .finally(log(`-- generated mp3 ${outmp3}`))

    await exec(`opusenc ${tmpfile} ${outogg}`)
      .catch(err => { if (err) log('error: '+err)})
      .finally(log(`-- generated opus ogg ${outogg}`))

    await exec(`mv ${outmp3} ${outogg} /usr/share/nginx/blckmtn/audio`)
      .catch(err => { if (err) log('error: '+err)})
      .finally(log(`-- moved ${outmp3} and ${outogg} to /usr/share/nginx/blckmtn/audio`))

    await exec(`rm ${tmpfile}`)
      .catch(err => { if (err) log('error: '+err)})
      .finally(log(`-- removed ${tmpfile}`))
  }

})
