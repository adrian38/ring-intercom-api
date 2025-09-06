import { Test, TestingModule } from '@nestjs/testing';
import { DeviceAuthController } from './device-auth.controller';

describe('DeviceAuthController', () => {
  let controller: DeviceAuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeviceAuthController],
    }).compile();

    controller = module.get<DeviceAuthController>(DeviceAuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
