
// Based on qrcode-generator by Kazuhiko Arase (MIT License)
// Adapted for ES Module usage in Cloudflare Workers

var QRCode;

(function () {
    //---------------------------------------------------------------------
    // QRCode
    //---------------------------------------------------------------------

    var PAD0 = 0xEC;
    var PAD1 = 0x11;

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    var _QRCode = function () {
        function _QRCode(typeNumber, errorCorrectLevel) {
            _classCallCheck(this, _QRCode);

            this.typeNumber = typeNumber;
            this.errorCorrectLevel = errorCorrectLevel;
            this.modules = null;
            this.moduleCount = 0;
            this.dataCache = null;
            this.dataList = [];
        }

        _createClass(_QRCode, [{
            key: "addData",
            value: function addData(data) {
                var newData = new QR8bitByte(data);
                this.dataList.push(newData);
                this.dataCache = null;
            }
        }, {
            key: "isDark",
            value: function isDark(row, col) {
                if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
                    throw new Error(row + "," + col);
                }
                return this.modules[row][col];
            }
        }, {
            key: "getModuleCount",
            value: function getModuleCount() {
                return this.moduleCount;
            }
        }, {
            key: "make",
            value: function make() {
                // Calculate automatically typeNumber if provided is < 1
                if (this.typeNumber < 1) {
                    var typeNumber = 1;
                    for (typeNumber = 1; typeNumber < 40; typeNumber++) {
                        var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, this.errorCorrectLevel);

                        var buffer = new QRBitBuffer();
                        var totalDataCount = 0;
                        for (var i = 0; i < this.dataList.length; i++) {
                            var data = this.dataList[i];
                            buffer.put(data.mode, 4);
                            buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber));
                            data.write(buffer);
                            totalDataCount += data.getLength();
                        }
                        if (buffer.getLengthInBits() <= QRRSBlock.getTotalDataCount(typeNumber, this.errorCorrectLevel) * 8) {
                            break;
                        }
                    }
                    this.typeNumber = typeNumber;
                }
                this.makeImpl(false, this.getBestMaskPattern());
            }
        }, {
            key: "makeImpl",
            value: function makeImpl(test, maskPattern) {
                this.moduleCount = this.typeNumber * 4 + 17;
                this.modules = new Array(this.moduleCount);
                for (var row = 0; row < this.moduleCount; row++) {
                    this.modules[row] = new Array(this.moduleCount);
                    for (var col = 0; col < this.moduleCount; col++) {
                        this.modules[row][col] = null;
                    }
                }

                this.setupPositionProbePattern(0, 0);
                this.setupPositionProbePattern(this.moduleCount - 7, 0);
                this.setupPositionProbePattern(0, this.moduleCount - 7);
                this.setupPositionAdjustPattern();
                this.setupTimingPattern();
                this.setupTypeInfo(test, maskPattern);

                if (this.typeNumber >= 7) {
                    this.setupTypeNumber(test);
                }

                if (this.dataCache == null) {
                    this.dataCache = _QRCode.createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
                }

                this.mapData(this.dataCache, maskPattern);
            }
        }, {
            key: "setupPositionProbePattern",
            value: function setupPositionProbePattern(row, col) {
                for (var r = -1; r <= 7; r++) {
                    if (row + r <= -1 || this.moduleCount <= row + r) continue;
                    for (var c = -1; c <= 7; c++) {
                        if (col + c <= -1 || this.moduleCount <= col + c) continue;
                        if (0 <= r && r <= 6 && (c == 0 || c == 6) || 0 <= c && c <= 6 && (r == 0 || r == 6) || 2 <= r && r <= 4 && 2 <= c && c <= 4) {
                            this.modules[row + r][col + c] = true;
                        } else {
                            this.modules[row + r][col + c] = false;
                        }
                    }
                }
            }
        }, {
            key: "setupPositionAdjustPattern",
            value: function setupPositionAdjustPattern() {
                var pos = QRUtil.getPatternPosition(this.typeNumber);
                for (var i = 0; i < pos.length; i++) {
                    for (var j = 0; j < pos.length; j++) {
                        var row = pos[i];
                        var col = pos[j];
                        if (this.modules[row][col] != null) {
                            continue;
                        }
                        for (var r = -2; r <= 2; r++) {
                            for (var c = -2; c <= 2; c++) {
                                if (r == -2 || r == 2 || c == -2 || c == 2 || r == 0 && c == 0) {
                                    this.modules[row + r][col + c] = true;
                                } else {
                                    this.modules[row + r][col + c] = false;
                                }
                            }
                        }
                    }
                }
            }
        }, {
            key: "setupTimingPattern",
            value: function setupTimingPattern() {
                for (var r = 8; r < this.moduleCount - 8; r++) {
                    if (this.modules[r][6] != null) {
                        continue;
                    }
                    this.modules[r][6] = r % 2 == 0;
                }
                for (var c = 8; c < this.moduleCount - 8; c++) {
                    if (this.modules[6][c] != null) {
                        continue;
                    }
                    this.modules[6][c] = c % 2 == 0;
                }
            }
        }, {
            key: "setupTypeInfo",
            value: function setupTypeInfo(test, maskPattern) {
                var data = this.errorCorrectLevel << 3 | maskPattern;
                var bits = QRUtil.getBCHTypeInfo(data);
                for (var i = 0; i < 15; i++) {
                    var mod = !test && (bits >> i & 1) == 1;
                    if (i < 6) {
                        this.modules[i][8] = mod;
                    } else if (i < 8) {
                        this.modules[i + 1][8] = mod;
                    } else {
                        this.modules[this.moduleCount - 15 + i][8] = mod;
                    }
                    var j = i < 8 ? this.moduleCount - i - 1 : 15 - i - 1; /**/ // Fixed from original logic to match standard
                    // There is a slight logic diff in versions, but this is a standard port.
                    // Actually let's trust the minified logic flow:

                    // Re-verifying logic from standard lib
                    if (i < 6) {
                        this.modules[i][8] = mod;
                    } else if (i < 8) {
                        this.modules[i + 1][8] = mod;
                    } else {
                        this.modules[this.moduleCount - 15 + i][8] = mod;
                    }

                    if (i < 8) {
                        this.modules[8][this.moduleCount - i - 1] = mod;
                    } else if (i < 9) {
                        this.modules[8][15 - i - 1 + 1] = mod;
                    } else {
                        this.modules[8][15 - i - 1] = mod;
                    }
                }
                this.modules[this.moduleCount - 8][8] = !test;
            }
        }, {
            key: "setupTypeNumber",
            value: function setupTypeNumber(test) {
                var bits = QRUtil.getBCHTypeNumber(this.typeNumber);
                for (var i = 0; i < 18; i++) {
                    var mod = !test && (bits >> i & 1) == 1;
                    this.modules[Math.floor(i / 3)][i % 3 + this.moduleCount - 8 - 3] = mod;
                    this.modules[i % 3 + this.moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
                }
            }
        }, {
            key: "mapData",
            value: function mapData(data, maskPattern) {
                var inc = -1;
                var row = this.moduleCount - 1;
                var bitIndex = 7;
                var byteIndex = 0;
                for (var col = this.moduleCount - 1; col > 0; col -= 2) {
                    if (col == 6) col--;
                    while (true) {
                        for (var c = 0; c < 2; c++) {
                            if (this.modules[row][col - c] == null) {
                                var dark = false;
                                if (byteIndex < data.length) {
                                    dark = (data[byteIndex] >>> bitIndex & 1) == 1;
                                }
                                var mask = QRUtil.getMask(maskPattern, row, col - c);
                                if (mask) {
                                    dark = !dark;
                                }
                                this.modules[row][col - c] = dark;
                                bitIndex--;
                                if (bitIndex == -1) {
                                    byteIndex++;
                                    bitIndex = 7;
                                }
                            }
                        }
                        row += inc;
                        if (row < 0 || this.moduleCount <= row) {
                            row -= inc;
                            inc = -inc;
                            break;
                        }
                    }
                }
            }
        }, {
            key: "getBestMaskPattern",
            value: function getBestMaskPattern() {
                var minLostPoint = 0;
                var pattern = 0;
                for (var i = 0; i < 8; i++) {
                    this.makeImpl(true, i);
                    var lostPoint = QRUtil.getLostPoint(this);
                    if (i == 0 || minLostPoint > lostPoint) {
                        minLostPoint = lostPoint;
                        pattern = i;
                    }
                }
                return pattern;
            }
        }], [{
            key: "createData",
            value: function createData(typeNumber, errorCorrectLevel, dataList) {
                var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);
                var buffer = new QRBitBuffer();
                for (var i = 0; i < dataList.length; i++) {
                    var data = dataList[i];
                    buffer.put(data.mode, 4);
                    buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber));
                    data.write(buffer);
                }
                var totalDataCount = 0;
                for (var _i = 0; _i < rsBlocks.length; _i++) {
                    totalDataCount += rsBlocks[_i].dataCount;
                }
                if (buffer.getLengthInBits() > totalDataCount * 8) {
                    throw new Error("code length overflow. (" + buffer.getLengthInBits() + ">" + totalDataCount * 8 + ")");
                }
                if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
                    buffer.put(0, 4);
                }
                while (buffer.getLengthInBits() % 8 != 0) {
                    buffer.putBit(false);
                }
                while (true) {
                    if (buffer.getLengthInBits() >= totalDataCount * 8) {
                        break;
                    }
                    buffer.put(PAD0, 8);
                    if (buffer.getLengthInBits() >= totalDataCount * 8) {
                        break;
                    }
                    buffer.put(PAD1, 8);
                }
                return _QRCode.createBytes(buffer, rsBlocks);
            }
        }, {
            key: "createBytes",
            value: function createBytes(buffer, rsBlocks) {
                var offset = 0;
                var maxDcCount = 0;
                var maxEcCount = 0;
                var dcdata = new Array(rsBlocks.length);
                var ecdata = new Array(rsBlocks.length);
                for (var r = 0; r < rsBlocks.length; r++) {
                    var dcCount = rsBlocks[r].dataCount;
                    var ecCount = rsBlocks[r].totalCount - dcCount;
                    maxDcCount = Math.max(maxDcCount, dcCount);
                    maxEcCount = Math.max(maxEcCount, ecCount);
                    dcdata[r] = new Array(dcCount);
                    for (var i = 0; i < dcdata[r].length; i++) {
                        dcdata[r][i] = 0xff & buffer.buffer[i + offset];
                    }
                    offset += dcCount;
                    var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
                    var rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);
                    var modPoly = rawPoly.mod(rsPoly);
                    ecdata[r] = new Array(rsPoly.getLength() - 1);
                    for (var _i2 = 0; _i2 < ecdata[r].length; _i2++) {
                        var modIndex = _i2 + modPoly.getLength() - ecdata[r].length;
                        ecdata[r][_i2] = modIndex >= 0 ? modPoly.get(modIndex) : 0;
                    }
                }
                var totalCodeCount = 0;
                for (var _i3 = 0; _i3 < rsBlocks.length; _i3++) {
                    totalCodeCount += rsBlocks[_i3].totalCount;
                }
                var data = new Array(totalCodeCount);
                var index = 0;
                for (var _i4 = 0; _i4 < maxDcCount; _i4++) {
                    for (var _r = 0; _r < rsBlocks.length; _r++) {
                        if (_i4 < dcdata[_r].length) {
                            data[index++] = dcdata[_r][_i4];
                        }
                    }
                }
                for (var _i5 = 0; _i5 < maxEcCount; _i5++) {
                    for (var _r2 = 0; _r2 < rsBlocks.length; _r2++) {
                        if (_i5 < ecdata[_r2].length) {
                            data[index++] = ecdata[_r2][_i5];
                        }
                    }
                }
                return data;
            }
        }]);

        return _QRCode;
    }();

    //---------------------------------------------------------------------
    // QR8bitByte
    //---------------------------------------------------------------------

    var QR8bitByte = function () {
        function QR8bitByte(data) {
            _classCallCheck(this, QR8bitByte);

            this.mode = QRMode.MODE_8BIT_BYTE;
            this.data = data;
        }

        _createClass(QR8bitByte, [{
            key: "getLength",
            value: function getLength(buffer) {
                return this.data.length;
            }
        }, {
            key: "write",
            value: function write(buffer) {
                for (var i = 0; i < this.data.length; i++) {
                    // we need validation for UTF-8?
                    buffer.put(this.data.charCodeAt(i), 8);
                }
            }
        }]);

        return QR8bitByte;
    }();

    //---------------------------------------------------------------------
    // QRMode
    //---------------------------------------------------------------------

    var QRMode = {
        MODE_NUMBER: 1 << 0,
        MODE_ALPHA_NUM: 1 << 1,
        MODE_8BIT_BYTE: 1 << 2,
        MODE_KANJI: 1 << 3
    };

    //---------------------------------------------------------------------
    // QRUtil
    //---------------------------------------------------------------------

    var QRUtil = {
        getBCHTypeInfo: function getBCHTypeInfo(data) {
            var d = data << 10;
            while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(1335) >= 0) {
                d ^= 1335 << QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(1335);
            }
            return (data << 10 | d) ^ 21522;
        },

        getBCHTypeNumber: function getBCHTypeNumber(data) {
            var d = data << 12;
            while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(7973) >= 0) {
                d ^= 7973 << QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(7973);
            }
            return (data << 12 | d) ^ 5412;
        },

        getBCHDigit: function getBCHDigit(data) {
            var digit = 0;
            while (data != 0) {
                digit++;
                data >>>= 1;
            }
            return digit;
        },

        getPatternPosition: function getPatternPosition(typeNumber) {
            return [
                [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54], [6, 32, 58], [6, 34, 62], [6, 26, 46, 66], [6, 26, 48, 70], [6, 26, 50, 74], [6, 30, 54, 78], [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90], [6, 28, 50, 72, 94], [6, 26, 50, 74, 98], [6, 30, 54, 78, 102], [6, 28, 54, 80, 106], [6, 32, 58, 84, 110], [6, 30, 58, 86, 114], [6, 34, 62, 90, 118], [6, 26, 50, 74, 98, 122], [6, 30, 54, 78, 102, 126], [6, 26, 52, 78, 104, 130], [6, 30, 56, 82, 108, 134], [6, 34, 60, 86, 112, 138], [6, 30, 58, 86, 114, 142], [6, 34, 62, 90, 118, 146], [6, 30, 54, 78, 102, 126, 150], [6, 24, 50, 76, 102, 128, 154], [6, 28, 54, 80, 106, 132, 158], [6, 32, 58, 84, 110, 136, 162], [6, 26, 54, 82, 110, 138, 166], [6, 30, 58, 86, 114, 142, 170]][typeNumber - 1];
        },

        getMask: function getMask(maskPattern, i, j) {
            switch (maskPattern) {
                case 0:
                    return (i + j) % 2 == 0;
                case 1:
                    return i % 2 == 0;
                case 2:
                    return j % 3 == 0;
                case 3:
                    return (i + j) % 3 == 0;
                case 4:
                    return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 == 0;
                case 5:
                    return i * j % 2 + i * j % 3 == 0;
                case 6:
                    return (i * j % 2 + i * j % 3) % 2 == 0;
                case 7:
                    return (i * j % 3 + (i + j) % 2) % 2 == 0;
                default:
                    throw new Error("bad maskPattern:" + maskPattern);
            }
        },

        getErrorCorrectPolynomial: function getErrorCorrectPolynomial(errorCorrectLength) {
            var a = new QRPolynomial([1], 0);
            for (var i = 0; i < errorCorrectLength; i++) {
                a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0));
            }
            return a;
        },

        getLengthInBits: function getLengthInBits(mode, type) {
            if (1 <= type && type < 10) {
                switch (mode) {
                    case QRMode.MODE_NUMBER:
                        return 10;
                    case QRMode.MODE_ALPHA_NUM:
                        return 9;
                    case QRMode.MODE_8BIT_BYTE:
                        return 8;
                    case QRMode.MODE_KANJI:
                        return 8;
                    default:
                        throw new Error("mode:" + mode);
                }
            } else if (type < 27) {
                switch (mode) {
                    case QRMode.MODE_NUMBER:
                        return 12;
                    case QRMode.MODE_ALPHA_NUM:
                        return 11;
                    case QRMode.MODE_8BIT_BYTE:
                        return 16;
                    case QRMode.MODE_KANJI:
                        return 10;
                    default:
                        throw new Error("mode:" + mode);
                }
            } else if (type < 41) {
                switch (mode) {
                    case QRMode.MODE_NUMBER:
                        return 14;
                    case QRMode.MODE_ALPHA_NUM:
                        return 13;
                    case QRMode.MODE_8BIT_BYTE:
                        return 16;
                    case QRMode.MODE_KANJI:
                        return 12;
                    default:
                        throw new Error("mode:" + mode);
                }
            } else {
                throw new Error("type:" + type);
            }
        },

        getLostPoint: function getLostPoint(qrCode) {
            var moduleCount = qrCode.getModuleCount();
            var lostPoint = 0;
            for (var row = 0; row < moduleCount; row++) {
                for (var col = 0; col < moduleCount; col++) {
                    var sameCount = 0;
                    var dark = qrCode.isDark(row, col);
                    for (var r = -1; r <= 1; r++) {
                        if (row + r < 0 || moduleCount <= row + r) {
                            continue;
                        }
                        for (var c = -1; c <= 1; c++) {
                            if (col + c < 0 || moduleCount <= col + c) {
                                continue;
                            }
                            if (r == 0 && c == 0) {
                                continue;
                            }
                            if (dark == qrCode.isDark(row + r, col + c)) {
                                sameCount++;
                            }
                        }
                    }
                    if (sameCount > 5) {
                        lostPoint += 3 + sameCount - 5;
                    }
                }
            }
            for (var _row = 0; _row < moduleCount - 1; _row++) {
                for (var _col = 0; _col < moduleCount - 1; _col++) {
                    var count = 0;
                    if (qrCode.isDark(_row, _col)) count++;
                    if (qrCode.isDark(_row + 1, _col)) count++;
                    if (qrCode.isDark(_row, _col + 1)) count++;
                    if (qrCode.isDark(_row + 1, _col + 1)) count++;
                    if (count == 0 || count == 4) {
                        lostPoint += 3;
                    }
                }
            }
            for (var _row2 = 0; _row2 < moduleCount; _row2++) {
                for (var _col2 = 0; _col2 < moduleCount - 6; _col2++) {
                    if (qrCode.isDark(_row2, _col2) && !qrCode.isDark(_row2, _col2 + 1) && qrCode.isDark(_row2, _col2 + 2) && qrCode.isDark(_row2, _col2 + 3) && qrCode.isDark(_row2, _col2 + 4) && !qrCode.isDark(_row2, _col2 + 5) && qrCode.isDark(_row2, _col2 + 6)) {
                        lostPoint += 40;
                    }
                    if (qrCode.isDark(_col2, _row2) && !qrCode.isDark(_col2 + 1, _row2) && qrCode.isDark(_col2 + 2, _row2) && qrCode.isDark(_col2 + 3, _row2) && qrCode.isDark(_col2 + 4, _row2) && !qrCode.isDark(_col2 + 5, _row2) && qrCode.isDark(_col2 + 6, _row2)) {
                        lostPoint += 40;
                    }
                }
            }
            var darkCount = 0;
            for (var _col3 = 0; _col3 < moduleCount; _col3++) {
                for (var _row3 = 0; _row3 < moduleCount; _row3++) {
                    if (qrCode.isDark(_row3, _col3)) {
                        darkCount++;
                    }
                }
            }
            var ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
            lostPoint += ratio * 10;
            return lostPoint;
        }
    };

    //---------------------------------------------------------------------
    // QRMath
    //---------------------------------------------------------------------

    var QRMath = {
        glog: function glog(n) {
            if (n < 1) {
                throw new Error("glog(" + n + ")");
            }
            return QRMath.LOG_TABLE[n];
        },

        gexp: function gexp(n) {
            while (n < 0) {
                n += 255;
            }
            while (n >= 256) {
                n -= 255;
            }
            return QRMath.EXP_TABLE[n];
        },

        EXP_TABLE: new Array(256),

        LOG_TABLE: new Array(256)
    };

    for (var i = 0; i < 8; i++) {
        QRMath.EXP_TABLE[i] = 1 << i;
    }
    for (var _i6 = 8; _i6 < 256; _i6++) {
        QRMath.EXP_TABLE[_i6] = QRMath.EXP_TABLE[_i6 - 4] ^ QRMath.EXP_TABLE[_i6 - 5] ^ QRMath.EXP_TABLE[_i6 - 6] ^ QRMath.EXP_TABLE[_i6 - 8];
    }
    for (var _i7 = 0; _i7 < 255; _i7++) {
        QRMath.LOG_TABLE[QRMath.EXP_TABLE[_i7]] = _i7;
    }

    //---------------------------------------------------------------------
    // QRPolynomial
    //---------------------------------------------------------------------

    var QRPolynomial = function () {
        function QRPolynomial(num, shift) {
            _classCallCheck(this, QRPolynomial);

            if (num.length == undefined) {
                throw new Error(num.length + "/" + shift);
            }
            var offset = 0;
            while (offset < num.length && num[offset] == 0) {
                offset++;
            }
            this.num = new Array(num.length - offset + shift);
            for (var _i8 = 0; _i8 < num.length - offset; _i8++) {
                this.num[_i8] = num[_i8 + offset];
            }
        }

        _createClass(QRPolynomial, [{
            key: "get",
            value: function get(index) {
                return this.num[index];
            }
        }, {
            key: "getLength",
            value: function getLength() {
                return this.num.length;
            }
        }, {
            key: "multiply",
            value: function multiply(e) {
                var num = new Array(this.getLength() + e.getLength() - 1);
                for (var _i9 = 0; _i9 < this.getLength(); _i9++) {
                    for (var j = 0; j < e.getLength(); j++) {
                        num[_i9 + j] ^= QRMath.gexp(QRMath.glog(this.get(_i9)) + QRMath.glog(e.get(j)));
                    }
                }
                return new QRPolynomial(num, 0);
            }
        }, {
            key: "mod",
            value: function mod(e) {
                if (this.getLength() - e.getLength() < 0) {
                    return this;
                }
                var ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
                var num = new Array(this.getLength());
                for (var _i10 = 0; _i10 < this.getLength(); _i10++) {
                    num[_i10] = this.get(_i10);
                }
                for (var _i11 = 0; _i11 < e.getLength(); _i11++) {
                    num[_i11] ^= QRMath.gexp(QRMath.glog(e.get(_i11)) + ratio);
                }
                return new QRPolynomial(num, 0).mod(e);
            }
        }]);

        return QRPolynomial;
    }();

    //---------------------------------------------------------------------
    // QRRSBlock
    //---------------------------------------------------------------------

    var QRRSBlock = function () {
        function QRRSBlock(totalCount, dataCount) {
            _classCallCheck(this, QRRSBlock);

            this.totalCount = totalCount;
            this.dataCount = dataCount;
        }

        _createClass(QRRSBlock, null, [{
            key: "getRSBlocks",
            value: function getRSBlocks(typeNumber, errorCorrectLevel) {
                var rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectLevel);
                if (rsBlock == undefined) {
                    throw new Error("bad rs block @ typeNumber:" + typeNumber + "/errorCorrectLevel:" + errorCorrectLevel);
                }
                var length = rsBlock.length / 3;
                var list = new Array();
                for (var _i12 = 0; _i12 < length; _i12++) {
                    var count = rsBlock[_i12 * 3 + 0];
                    var totalCount = rsBlock[_i12 * 3 + 1];
                    var dataCount = rsBlock[_i12 * 3 + 2];
                    for (var j = 0; j < count; j++) {
                        list.push(new QRRSBlock(totalCount, dataCount));
                    }
                }
                return list;
            }
        }, {
            key: "getRsBlockTable",
            value: function getRsBlockTable(typeNumber, errorCorrectLevel) {
                switch (errorCorrectLevel) {
                    case QRErrorCorrectLevel.L:
                        return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
                    case QRErrorCorrectLevel.M:
                        return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
                    case QRErrorCorrectLevel.Q:
                        return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
                    case QRErrorCorrectLevel.H:
                        return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
                    default:
                        return undefined;
                }
            }
        }]);

        return QRRSBlock;
    }();

    QRRSBlock.RS_BLOCK_TABLE = [
        // L
        // M
        // Q
        // H
        [1, 26, 19], [1, 26, 16], [1, 26, 13], [1, 26, 9], [1, 44, 34], [1, 44, 28], [1, 44, 22], [1, 44, 16], [1, 70, 55], [1, 70, 44], [2, 35, 17], [2, 35, 13], [1, 100, 80], [2, 50, 32], [2, 50, 24], [4, 25, 9], [1, 134, 108], [2, 67, 43], [2, 33, 15, 2, 34, 16], [2, 33, 11, 2, 34, 12], [2, 86, 68], [4, 43, 27], [4, 43, 19], [4, 43, 15], [2, 98, 78], [4, 49, 31], [2, 32, 14, 4, 33, 15], [4, 39, 13, 1, 40, 14], [2, 121, 97], [2, 60, 38, 2, 61, 39], [4, 40, 18, 2, 41, 19], [4, 40, 14, 2, 41, 15], [2, 121, 93, 2, 122, 94], [4, 53, 30, 4, 54, 31], [4, 47, 18, 4, 48, 19], [4, 47, 14, 4, 48, 15], [2, 113, 91, 2, 114, 92], [4, 59, 35, 2, 60, 36], [6, 48, 19, 2, 49, 20], [6, 48, 16, 2, 49, 17], [4, 107, 86], [4, 69, 41, 1, 70, 42], [8, 43, 19, 1, 44, 20], [6, 43, 14, 2, 44, 15], [2, 96, 75, 4, 97, 76], [6, 43, 37, 2, 44, 38], [3, 45, 15, 8, 46, 16], [3, 45, 12, 8, 46, 13], [6, 109, 87], [6, 61, 33, 2, 62, 34], [5, 60, 19, 5, 61, 20], [5, 60, 15, 5, 61, 16], [4, 102, 74, 4, 103, 75], [8, 60, 40, 1, 61, 41], [5, 50, 19, 7, 51, 20], [5, 50, 15, 7, 51, 16], [6, 102, 73, 2, 103, 74], [3, 75, 47, 6, 76, 48], [4, 51, 19, 6, 52, 20], [3, 53, 15, 8, 54, 16], [3, 67, 45, 11, 68, 46], [6, 60, 50, 4, 61, 51], [9, 58, 26, 4, 59, 27], [5, 52, 14, 7, 53, 15], [5, 82, 57, 12, 83, 58], [2, 67, 30, 9, 68, 31], [6, 56, 18, 9, 57, 19], [3, 63, 13, 11, 64, 14], [5, 120, 87, 1, 121, 88], [3, 53, 29, 13, 54, 30], [2, 55, 18, 14, 56, 19], [17, 55, 15], [2, 98, 70, 7, 99, 71], [17, 50, 31], [5, 62, 19, 11, 63, 20], [5, 62, 15, 11, 63, 16], [4, 108, 79, 7, 109, 80], [3, 64, 47, 14, 65, 48], [11, 55, 19, 4, 56, 20], [11, 55, 15, 5, 56, 16], [6, 107, 78, 8, 108, 79], [6, 75, 58, 11, 76, 59], [4, 67, 26, 14, 68, 27], [10, 58, 14, 6, 59, 15], [9, 77, 52, 11, 78, 53], [11, 51, 25, 6, 52, 26], [6, 72, 23, 14, 73, 24], [16, 54, 14, 2, 55, 15], [6, 113, 85, 9, 114, 86], [2, 91, 71, 17, 92, 72], [6, 73, 26, 14, 74, 27], [11, 55, 14, 7, 56, 15], [9, 117, 88, 12, 118, 89], [25, 66, 44], [13, 75, 27, 8, 76, 28], [13, 57, 16, 11, 58, 17], [6, 119, 89, 16, 120, 90], [10, 88, 68, 13, 89, 69], [10, 69, 32, 15, 70, 33], [7, 73, 23, 19, 74, 24], [13, 116, 85, 11, 117, 86], [12, 91, 50, 13, 92, 51], [12, 70, 26, 16, 71, 27], [29, 58, 15], [2, 111, 80, 24, 112, 81], [17, 81, 50, 9, 82, 51], [26, 68, 36], [17, 62, 17, 10, 63, 18], [2, 116, 82, 25, 117, 83], [19, 81, 46, 10, 82, 47], [15, 66, 26, 15, 67, 27], [17, 56, 14, 13, 57, 15], [10, 118, 83, 19, 119, 84], [2, 80, 48, 30, 81, 49], [40, 71, 36], [6, 56, 16, 26, 57, 17], [16, 123, 88, 13, 124, 89], [33, 96, 67], [20, 67, 34, 16, 68, 35], [28, 55, 15, 8, 56, 16], [5, 119, 83, 29, 120, 84], [11, 113, 72, 22, 114, 73], [20, 84, 43, 18, 85, 44], [18, 66, 17, 21, 67, 18], [17, 115, 80, 19, 116, 81], [5, 105, 61, 30, 106, 62], [28, 77, 43, 14, 78, 44], [17, 68, 18, 25, 69, 19], [6, 112, 73, 34, 113, 74], [3, 98, 56, 36, 99, 57], [9, 81, 36, 36, 82, 37], [20, 60, 16, 26, 61, 17], [25, 127, 98, 14, 128, 99], [6, 136, 70, 34, 137, 71], [19, 83, 50, 27, 84, 51], [5, 78, 19, 44, 79, 20], [16, 115, 78, 25, 116, 79], [3, 127, 94, 38, 128, 95], [17, 86, 53, 26, 87, 54], [25, 63, 19, 28, 64, 20], [14, 128, 93, 27, 129, 94], [4, 114, 78, 39, 115, 79], [36, 84, 52, 10, 85, 53], [48, 61, 19, 7, 62, 20], [6, 118, 80, 39, 119, 81], [6, 105, 59, 41, 106, 60], [21, 79, 39, 27, 80, 40], [18, 71, 20, 35, 72, 21], [30, 121, 91, 17, 122, 92], [20, 130, 78, 28, 131, 79], [25, 85, 47, 24, 86, 48], [42, 69, 22, 17, 70, 23]];

    //---------------------------------------------------------------------
    // QRBitBuffer
    //---------------------------------------------------------------------

    var QRBitBuffer = function () {
        function QRBitBuffer() {
            _classCallCheck(this, QRBitBuffer);

            this.buffer = new Array();
            this.length = 0;
        }

        _createClass(QRBitBuffer, [{
            key: "get",
            value: function get(index) {
                var bufIndex = Math.floor(index / 8);
                return (this.buffer[bufIndex] >>> 7 - index % 8 & 1) == 1;
            }
        }, {
            key: "put",
            value: function put(num, length) {
                for (var i = 0; i < length; i++) {
                    this.putBit((num >>> length - i - 1 & 1) == 1);
                }
            }
        }, {
            key: "getLengthInBits",
            value: function getLengthInBits() {
                return this.length;
            }
        }, {
            key: "putBit",
            value: function putBit(bit) {
                var bufIndex = Math.floor(this.length / 8);
                if (this.buffer.length <= bufIndex) {
                    this.buffer.push(0);
                }
                if (bit) {
                    this.buffer[bufIndex] |= 0x80 >>> this.length % 8;
                }
                this.length++;
            }
        }]);

        return QRBitBuffer;
    }();

    QRCode = _QRCode;
})();

export { QRCode };
export default QRCode;
