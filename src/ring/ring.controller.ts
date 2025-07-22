import { Body, Controller, Post, Res, HttpStatus } from '@nestjs/common';
import { RingService } from './ring.service';
import { Response } from 'express';

@Controller('ring')
export class RingController {
  constructor(private readonly ringService: RingService) {}

  @Post('open-door')
  async openDoor(@Body() body: { email: string }, @Res() res: Response) {
    try {
      await this.ringService.openDoor(body.email);
      return res
        .status(HttpStatus.OK)
        .json({ success: true, message: 'Puerta abierta exitosamente.' });
    } catch (error) {
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: error.message });
    }
  }
}
