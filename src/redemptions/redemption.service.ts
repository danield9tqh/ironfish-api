/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable, NotFoundException } from '@nestjs/common';
import { KycStatus, Redemption, User } from '@prisma/client';
import { ApiConfigService } from '../api-config/api-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { BasePrismaClient } from '../prisma/types/base-prisma-client';
import { UserPointsService } from '../user-points/user-points.service';

export const REDEMPTION_BAN_LIST = ['PRK', 'IRN'];
@Injectable()
export class RedemptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userPointsService: UserPointsService,
    private readonly config: ApiConfigService,
  ) {}

  async findOrThrow(user: User): Promise<Redemption> {
    const redemption = await this.find(user);
    if (!redemption) {
      throw new NotFoundException('Redemption for user not found');
    }
    return redemption;
  }

  async find(user: User): Promise<Redemption | null> {
    return this.prisma.redemption.findFirst({
      where: { user: { id: user.id } },
    });
  }

  async update(
    redemption: Redemption,
    data: { kyc_status: KycStatus; jumio_account_id?: string },
    prisma?: BasePrismaClient,
  ): Promise<Redemption> {
    const client = prisma ?? this.prisma;

    return client.redemption.update({
      data: data,
      where: {
        id: redemption.id,
      },
    });
  }

  async incrementAttempts(
    redemption: Redemption,
    prisma?: BasePrismaClient,
  ): Promise<Redemption> {
    const client = prisma ?? this.prisma;

    return client.redemption.update({
      data: {
        kyc_attempts: {
          increment: 1,
        },
      },
      where: {
        id: redemption.id,
      },
    });
  }

  async create(
    user: User,
    public_address: string,
    prisma?: BasePrismaClient,
  ): Promise<Redemption> {
    const client = prisma ?? this.prisma;

    return client.redemption.create({
      data: {
        user: { connect: { id: user.id } },
        public_address,
        kyc_status: KycStatus.IN_PROGRESS,
      },
    });
  }

  async canAttempt(
    redemption: Redemption | null,
    user: User,
    prisma?: BasePrismaClient,
  ): Promise<string | null> {
    const points = await this.userPointsService.findOrThrow(user.id, prisma);

    if (points.total_points === 0) {
      return 'User has no points';
    }

    if (!redemption) {
      return null;
    }

    if (REDEMPTION_BAN_LIST.includes(user.country_code)) {
      return `User is from a banned country: ${user.country_code}`;
    }

    const kycMaxAttempts = this.config.get<number>('KYC_MAX_ATTEMPTS');

    if (redemption.kyc_attempts >= kycMaxAttempts) {
      return `Max attempts reached ${redemption.kyc_attempts} / ${kycMaxAttempts}`;
    }

    if (redemption.kyc_status !== KycStatus.TRY_AGAIN) {
      return `Redemption status is not TRY_AGAIN: ${redemption.kyc_status}`;
    }

    return null;
  }
}