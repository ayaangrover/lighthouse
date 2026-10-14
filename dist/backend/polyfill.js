const { File } = require('buffer');

if (typeof globalThis.File === 'undefined') {
    globalThis.File = File;
}
