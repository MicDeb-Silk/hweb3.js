/*
 This file is part of web3.js.

 web3.js is free software: you can redistribute it and/or modify
 it under the terms of the GNU Lesser General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 web3.js is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the

 GNU Lesser General Public License for more details.

 You should have received a copy of the GNU Lesser General Public License
 along with web3.js.  If not, see <http://www.gnu.org/licenses/>.
 */
/**
 * @file accounts.js
 * @author Fabian Vogelsteller <fabian@ethereum.org>
 * @date 2017
 */

'use strict';

import { PrivateKey } from "@hashgraph/sdk";
import { packageInit } from '@micdeb-ariane/hweb3-core';
import Method from '@micdeb-ariane/hweb3-core-method';
import Account from 'eth-lib/lib/account';
import scrypt from 'scrypt-js';
import uuid from 'uuid';
import utils from '@micdeb-ariane/hweb3-utils';
import ethereumjsUtil from 'ethereumjs-util';

const cryp = (typeof global === 'undefined') ? require('crypto-browserify') : require('crypto');

import createNewAccountId from './createNewAccountId';

var Accounts = function Accounts() {
    var _this = this;

    // sets _requestmanager
    packageInit(this, arguments);

    // remove unecessary core functions
    delete this.BatchRequest;
    delete this.extend;

    var _ethereumCall = [
        new Method({
            name: 'getNetworkId',
            call: 'net_version',
            params: 0,
            outputFormatter: parseInt,
        }),
        new Method({
            name: 'getChainId',
            call: 'eth_chainId',
            params: 0,
            outputFormatter: utils.hexToNumber,
        }),
        new Method({
            name: 'getGasPrice',
            call: 'eth_gasPrice',
            params: 0,
        }),
        new Method({
            name: 'getTransactionCount',
            call: 'eth_getTransactionCount',
            params: 2,
            inputFormatter: [function (address) {
                if (utils.isAddress(address)) {
                    return address;
                } else {
                    throw new Error('Address ' + address + ' is not a valid address to get the "transactionCount".');
                }
            }, function () {
                return 'latest';
            }],
        }),
        new Method({
            name: 'getBlockByNumber',
            call: 'eth_getBlockByNumber',
            params: 2,
            inputFormatter: [function (blockNumber) {
                return blockNumber ? utils.toHex(blockNumber) : 'latest';
            }, function () {
                return false;
            }],
        }),
    ];

    // attach methods to this._ethereumCall
    this._ethereumCall = {};
    _ethereumCall.forEach((method) => {
        method.attachToObject(_this._ethereumCall);
        method.setRequestManager(_this._requestManager);
    });

    this.wallet = new Wallet(this);
};

// TODO Get myAccountId and myPrivateKey from Wallet
Accounts.prototype._addAccountFunctions = function (newAccountPrivateKey, address) {
    const _this = this;
    const newAccountPublicKey = newAccountPrivateKey.publicKey;

    const account = {
        address,
        privateKey: newAccountPrivateKey,
        publicKey: newAccountPublicKey,
    };

    // add sign functions
    account.signTransaction = function signTransaction(tx) {
        return _this.signTransaction(tx);
    };

    account.sign = function sign(data) {
        return _this.sign(data);
    };

    account.encrypt = function encrypt(password, options) {
        return _this.encrypt(account.privateKey, password, options);
    };

    return account;
};

Accounts.prototype.create = function create(cb) {
    const newAccountPrivateKey = PrivateKey.generateED25519();
    createNewAccountId.call(this, newAccountPrivateKey, cb);
};

// TODO Not available
Accounts.prototype.privateKeyToAccount = function privateKeyToAccount() {
    throw new Error("Not available");
};

Accounts.prototype.signTransaction = function signTransaction(tx) {
    return this.currentProvider.signTransaction(tx);
};

/* jshint ignore:start */
Accounts.prototype.recoverTransaction = function recoverTransaction(rawTx, txOptions = {}) {
    // Rely on EthereumJs/tx to determine the type of transaction
    const data = Buffer.from(rawTx.slice(2), "hex")
    const tx = TransactionFactory.fromSerializedData(data);
    //update checksum
    return utils.toChecksumAddress(tx.getSenderAddress().toString("hex"));
};
/* jshint ignore:end */

// TODO not sure if it is needed
Accounts.prototype.hashMessage = function hashMessage(data) {
    var messageHex = utils.isHexStrict(data) ? data : utils.utf8ToHex(data);
    var messageBytes = utils.hexToBytes(messageHex);
    var messageBuffer = Buffer.from(messageBytes);
    var preamble = '\x19Ethereum Signed Message:\n' + messageBytes.length;
    var preambleBuffer = Buffer.from(preamble);
    var ethMessage = Buffer.concat([preambleBuffer, messageBuffer]);
    return ethereumjsUtil.bufferToHex(ethereumjsUtil.keccak256(ethMessage));
};

Accounts.prototype.sign = function sign(data) {
    const signature = this.currentProvider.sign(data);

    return {
        message: data,
        signature: signature,
    };
};

Accounts.prototype.recover = function recover(message, signature, preFixed) {
    var args = [].slice.apply(arguments);

    if (!!message && typeof message === 'object') {
        return this.recover(message.messageHash, Account.encodeSignature([message.v, message.r, message.s]), true);
    }

    if (!preFixed) {
        message = this.hashMessage(message);
    }

    if (args.length >= 4) {
        preFixed = args.slice(-1)[0];
        preFixed = typeof preFixed === 'boolean' ? !!preFixed : false;

        return this.recover(message, Account.encodeSignature(args.slice(1, 4)), preFixed); // v, r, s
    }
    return Account.recover(message, signature);
};

// Taken from https://github.com/ethereumjs/ethereumjs-wallet
Accounts.prototype.decrypt = function (v3Keystore, password, nonStrict) {
    /* jshint maxcomplexity: 10 */

    if (!(typeof password === 'string')) {
        throw new Error('No password given.');
    }

    var json = (!!v3Keystore && typeof v3Keystore === 'object') ? v3Keystore : JSON.parse(nonStrict ? v3Keystore.toLowerCase() : v3Keystore);

    if (json.version !== 3) {
        throw new Error('Not a valid V3 wallet');
    }

    var derivedKey;
    var kdfparams;
    if (json.crypto.kdf === 'scrypt') {
        kdfparams = json.crypto.kdfparams;

        // FIXME: support progress reporting callback
        derivedKey = scrypt.syncScrypt(Buffer.from(password), Buffer.from(kdfparams.salt, 'hex'), kdfparams.n, kdfparams.r, kdfparams.p, kdfparams.dklen);
    } else if (json.crypto.kdf === 'pbkdf2') {
        kdfparams = json.crypto.kdfparams;

        if (kdfparams.prf !== 'hmac-sha256') {
            throw new Error('Unsupported parameters to PBKDF2');
        }

        derivedKey = cryp.pbkdf2Sync(Buffer.from(password), Buffer.from(kdfparams.salt, 'hex'), kdfparams.c, kdfparams.dklen, 'sha256');
    } else {
        throw new Error('Unsupported key derivation scheme');
    }

    var ciphertext = Buffer.from(json.crypto.ciphertext, 'hex');

    var mac = utils.sha3(Buffer.from([...derivedKey.slice(16, 32), ...ciphertext])).replace('0x', '');
    if (mac !== json.crypto.mac) {
        throw new Error('Key derivation failed - possibly wrong password');
    }

    var decipher = cryp.createDecipheriv(json.crypto.cipher, derivedKey.slice(0, 16), Buffer.from(json.crypto.cipherparams.iv, 'hex'));
    var seed = '0x' + Buffer.from([...decipher.update(ciphertext), ...decipher.final()]).toString('hex');

    return this.privateKeyToAccount(seed, true);
};

Accounts.prototype.encrypt = function (privateKey, password, options) {
    /* jshint maxcomplexity: 20 */
    // var account = this.privateKeyToAccount(privateKey, true);

    options = options || {};
    var salt = options.salt || cryp.randomBytes(32);
    var iv = options.iv || cryp.randomBytes(16);

    var derivedKey;
    var kdf = options.kdf || 'scrypt';
    var kdfparams = {
        dklen: options.dklen || 32,
        salt: salt.toString('hex'),
    };

    if (kdf === 'pbkdf2') {
        kdfparams.c = options.c || 262144;
        kdfparams.prf = 'hmac-sha256';
        derivedKey = cryp.pbkdf2Sync(Buffer.from(password), Buffer.from(kdfparams.salt, 'hex'), kdfparams.c, kdfparams.dklen, 'sha256');
    } else if (kdf === 'scrypt') {
        // FIXME: support progress reporting callback
        kdfparams.n = options.n || 8192; // 2048 4096 8192 16384
        kdfparams.r = options.r || 8;
        kdfparams.p = options.p || 1;
        derivedKey = scrypt.syncScrypt(Buffer.from(password), Buffer.from(kdfparams.salt, 'hex'), kdfparams.n, kdfparams.r, kdfparams.p, kdfparams.dklen);
    } else {
        throw new Error('Unsupported kdf');
    }

    var cipher = cryp.createCipheriv(options.cipher || 'aes-128-ctr', derivedKey.slice(0, 16), iv);
    if (!cipher) {
        throw new Error('Unsupported cipher');
    }

    var ciphertext = Buffer.from([
        ...cipher.update(Buffer.from(privateKey, 'hex')),
        ...cipher.final()],
    );

    var mac = utils.sha3(Buffer.from([...derivedKey.slice(16, 32), ...ciphertext])).replace('0x', '');

    return {
        version: 3,
        id: uuid.v4({ random: options.uuid || cryp.randomBytes(16) }),
        // TODO add accountId value
        // address: account.address.toLowerCase().replace('0x', ''),
        crypto: {
            ciphertext: ciphertext.toString('hex'),
            cipherparams: {
                iv: iv.toString('hex'),
            },
            cipher: options.cipher || 'aes-128-ctr',
            kdf: kdf,
            kdfparams: kdfparams,
            mac: mac.toString('hex'),
        },
    };
};

// Note: this is trying to follow closely the specs on
// http://web3js.readthedocs.io/en/1.0/web3-eth-accounts.html

function Wallet(accounts) {
    this._accounts = accounts;
    this.length = 0;
    this.defaultKeyName = 'web3js_wallet';
}

Wallet.prototype._findSafeIndex = function (pointer) {
    pointer = pointer || 0;
    if (this.hasOwnProperty(pointer)) {
        return this._findSafeIndex(pointer + 1);
    } else {
        return pointer;
    }
};

Wallet.prototype._currentIndexes = function () {
    var keys = Object.keys(this);
    var indexes = keys
        .map(function (key) {
            return parseInt(key);
        })
        .filter(function (n) {
            return (n < 9e20);
        });

    return indexes;
};

Wallet.prototype.create = function (numberOfAccounts, entropy) {
    for (var i = 0; i < numberOfAccounts; ++i) {
        this.add(this._accounts.create(entropy).privateKey);
    }
    return this;
};

Wallet.prototype.add = function (account) {

    if (typeof account === 'string') {
        account = this._accounts.privateKeyToAccount(account);
    }
    if (!this[account.address]) {
        account = this._accounts.privateKeyToAccount(account.privateKey);
        account.index = this._findSafeIndex();

        this[account.index] = account;
        this[account.address] = account;
        this[account.address.toLowerCase()] = account;

        this.length++;

        return account;
    } else {
        return this[account.address];
    }
};

Wallet.prototype.remove = function (addressOrIndex) {
    var account = this[addressOrIndex];

    if (account && account.address) {
        // address
        this[account.address].privateKey = null;
        delete this[account.address];
        // address lowercase
        this[account.address.toLowerCase()].privateKey = null;
        delete this[account.address.toLowerCase()];
        // index
        this[account.index].privateKey = null;
        delete this[account.index];

        this.length--;

        return true;
    } else {
        return false;
    }
};

Wallet.prototype.clear = function () {
    var _this = this;
    var indexes = this._currentIndexes();

    indexes.forEach(function (index) {
        _this.remove(index);
    });

    return this;
};

Wallet.prototype.encrypt = function (password, options) {
    var _this = this;
    var indexes = this._currentIndexes();

    var accounts = indexes.map(function (index) {
        return _this[index].encrypt(password, options);
    });

    return accounts;
};

Wallet.prototype.decrypt = function (encryptedWallet, password) {
    var _this = this;

    encryptedWallet.forEach(function (keystore) {
        var account = _this._accounts.decrypt(keystore, password);

        if (account) {
            _this.add(account);
        } else {
            throw new Error('Couldn\'t decrypt accounts. Password wrong?');
        }
    });

    return this;
};

Wallet.prototype.save = function (password, keyName) {
    localStorage.setItem(keyName || this.defaultKeyName, JSON.stringify(this.encrypt(password)));

    return true;
};

Wallet.prototype.load = function (password, keyName) {
    var keystore = localStorage.getItem(keyName || this.defaultKeyName);

    if (keystore) {
        try {
            keystore = JSON.parse(keystore);
        } catch (e) {

        }
    }

    return this.decrypt(keystore || [], password);
};

if (!storageAvailable('localStorage')) {
    delete Wallet.prototype.save;
    delete Wallet.prototype.load;
}

/**
 * Checks whether a storage type is available or not
 * For more info on how this works, please refer to MDN documentation
 * https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API#Feature-detecting_localStorage
 *
 * @method storageAvailable
 * @param {String} type the type of storage ('localStorage', 'sessionStorage')
 * @returns {Boolean} a boolean indicating whether the specified storage is available or not
 */
function storageAvailable(type) {
    var storage;
    try {
        storage = self[type];
        var x = '__storage_test__';
        storage.setItem(x, x);
        storage.removeItem(x);
        return true;
    } catch (e) {
        return e && (
                // everything except Firefox
                e.code === 22 ||
                // Firefox
                e.code === 1014 ||
                // test name field too, because code might not be present
                // everything except Firefox
                e.name === 'QuotaExceededError' ||
                // Firefox
                e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
            // acknowledge QuotaExceededError only if there's something already stored
            (storage && storage.length !== 0);
    }
}

export default Accounts;

