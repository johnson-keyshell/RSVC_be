import { WinstonModule, utilities as nestWinstonModuleUtilities } from 'nest-winston';
import { format, transports } from 'winston';
import 'winston-daily-rotate-file';

export const winstonLogger = (appName: string) => {
  const transportOptions: any = [
    new transports.Console({
      format: format.combine(
        format.errors({ stack: true }),
        format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss',
        }),
        format.ms(),
        nestWinstonModuleUtilities.format.nestLike(appName, {
          colors: true,
          prettyPrint: true,
        }),
      ),
    }),
  ];

  if (process.env.NODE_ENV !== 'development') {
    transportOptions.push(
      new transports.DailyRotateFile({
        filename: `logs/app-log-%DATE%.log`,
        format: format.combine(format.timestamp(), format.json(), format.prettyPrint()),
        datePattern: 'YYYY-MM-DD',
        zippedArchive: false,
        maxFiles: '30d',
      }),
    );
  }

  return WinstonModule.createLogger({
    level: 'debug',
    exitOnError: false,
    transports: transportOptions,
  });
};
