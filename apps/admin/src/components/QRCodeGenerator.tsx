
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import QRCodeStyling, {
    DrawType,
    TypeNumber,
    Mode,
    ErrorCorrectionLevel,
    DotType,
    CornerSquareType,
    CornerDotType,
    Options
} from "qr-code-styling";

export interface QRCodeGeneratorProps {
    data: string;
    size?: number;
    image?: string;
    dotsOptions?: {
        color: string;
        type: DotType;
    };
    cornersSquareOptions?: {
        color: string;
        type: CornerSquareType;
    };
    cornersDotOptions?: {
        color: string;
        type: CornerDotType;
    };
    backgroundOptions?: {
        color: string;
    };
    imageOptions?: {
        crossOrigin?: string;
        margin?: number;
        imageSize?: number;
    };
}

export interface QRCodeHandle {
    download: (extension?: 'png' | 'jpeg' | 'webp' | 'svg') => void;
}

const QRCodeGenerator = forwardRef<QRCodeHandle, QRCodeGeneratorProps>(
    ({ data, size = 300, image, dotsOptions, cornersSquareOptions, cornersDotOptions, backgroundOptions, imageOptions }, ref) => {
        const refContainer = useRef<HTMLDivElement>(null);
        const qrCode = useRef<QRCodeStyling>();

        // Initial Setup
        useEffect(() => {
            qrCode.current = new QRCodeStyling({
                width: size,
                height: size,
                type: "svg" as DrawType,
                data: data,
                image: image,
                dotsOptions: dotsOptions,
                cornersSquareOptions: cornersSquareOptions,
                cornersDotOptions: cornersDotOptions,
                backgroundOptions: backgroundOptions,
                imageOptions: imageOptions
            });

            if (refContainer.current) {
                qrCode.current.append(refContainer.current);
            }
        }, []);

        // Handling Updates
        useEffect(() => {
            if (!qrCode.current) return;
            qrCode.current.update({
                width: size,
                height: size,
                data: data,
                image: image,
                dotsOptions: dotsOptions,
                cornersSquareOptions: cornersSquareOptions,
                cornersDotOptions: cornersDotOptions,
                backgroundOptions: backgroundOptions,
                imageOptions: imageOptions
            });
        }, [data, size, image, dotsOptions, cornersSquareOptions, cornersDotOptions, backgroundOptions, imageOptions]);

        // Expose methods to parent
        useImperativeHandle(ref, () => ({
            download: (extension = 'svg') => {
                qrCode.current?.download({
                    name: "visualtaste-qr",
                    extension: extension
                });
            }
        }));

        return <div ref={refContainer} />;
    }
);

QRCodeGenerator.displayName = "QRCodeGenerator";

export default QRCodeGenerator;
