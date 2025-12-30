
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import QRCodeStyling, {
    DrawType,
    DotType,
    CornerSquareType,
    CornerDotType,
    Gradient
} from "qr-code-styling";

export interface QRCodeGeneratorProps {
    data: string;
    size?: number;
    image?: string;
    dotsOptions?: {
        color?: string;
        type?: DotType;
        gradient?: Gradient;
    };
    cornersSquareOptions?: {
        color?: string;
        type?: CornerSquareType;
        gradient?: Gradient;
    };
    cornersDotOptions?: {
        color?: string;
        type?: CornerDotType;
        gradient?: Gradient;
    };
    backgroundOptions?: {
        color?: string;
        gradient?: Gradient;
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
                // Clear previous QR code before appending new one
                refContainer.current.innerHTML = '';
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
        }, [data, size, image, JSON.stringify(dotsOptions), JSON.stringify(cornersSquareOptions), JSON.stringify(cornersDotOptions), JSON.stringify(backgroundOptions), JSON.stringify(imageOptions)]);

        // Expose methods to parent
        useImperativeHandle(ref, () => ({
            download: (extension = 'svg') => {
                qrCode.current?.download({
                    name: "visualtaste-qr",
                    extension: extension
                });
            }
        }));

        return <div ref={refContainer} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }} />;
    }
);

QRCodeGenerator.displayName = "QRCodeGenerator";

export default QRCodeGenerator;
