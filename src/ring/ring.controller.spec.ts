import { Test, TestingModule } from '@nestjs/testing';
import { RingController } from './ring.controller';

describe('RingController', () => {
  let controller: RingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RingController],
    }).compile();

    controller = module.get<RingController>(RingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
