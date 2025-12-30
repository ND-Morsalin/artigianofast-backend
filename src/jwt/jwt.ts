import { Request } from "express";
import jwt from "jsonwebtoken";

const envConfig = {
  jwt: {
    secret: process.env.JWT_SECRET || "change_me",
    access_token_expires: process.env.JWT_ACCESS_TOKEN_EXPIRES || "15d",
    refresh_token_expires: process.env.JWT_REFRESH_TOKEN_EXPIRES || "17d",
    access_cookie_name: process.env.JWT_ACCESS_COOKIE_NAME || "access_token",
    refresh_cookie_name: process.env.JWT_REFRESH_COOKIE_NAME || "refresh_token",
  },
};

export interface IJWtPayload {
   userId?: number | string;
  phone_number?: string;
  role?: any;
  iat?: number;
  exp?: number;
  isAuthenticated: boolean;
  username: string;
}

export interface IMobileDataTokenPayload{
  
        userId?: number | string;
        planId?: number | string;
        mobileSessionId?: string;
        permissions?: any;
      
}

class JWT {
  private signToken = async (
    payload: IJWtPayload | IMobileDataTokenPayload,
    secret: string,
    expiresIn: string
  ): Promise<string> => {
    return jwt.sign(payload, secret, { expiresIn } as any);
  };

  private generateAccessToken = async (
    payload: IJWtPayload | IMobileDataTokenPayload
  ): Promise<string> => {
    return this.signToken(
      payload,
      envConfig.jwt.secret,
      envConfig.jwt.access_token_expires
    );
  };

  private generateRefreshToken = async (
    payload: IJWtPayload
  ): Promise<string> => {
    return this.signToken(
      payload,
      envConfig.jwt.secret,
      envConfig.jwt.refresh_token_expires
    );
  };

  async generateTokens(
    payload: IJWtPayload
  ): Promise<{ access_token: string; refresh_token: string }> {
    const access_token = await this.generateAccessToken(payload);
    const refresh_token = await this.generateRefreshToken(payload);
    return { access_token, refresh_token };
  }
  async generateMobileDataTokens(
    payload: IMobileDataTokenPayload
  ): Promise<{ mobile_data_token : string }> {
    const mobile_data_token = await this.generateAccessToken(payload);
    return { mobile_data_token  };
  }

  verifyToken(token: string): IJWtPayload | IMobileDataTokenPayload | null {
    try {
      const decoded = jwt.verify(token, envConfig.jwt.secret) as IJWtPayload | IMobileDataTokenPayload ;
      return decoded;
    } catch (error) {
      console.error("Token verification failed:", error);
      return null;
    }
  }
}

export const JwtInstance = new JWT();
