package com.auroraplus;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

// @EnableScheduling habilita AvisoVencimientoTrialJob (recordatorio de trial por vencer).
@SpringBootApplication
@EnableScheduling
public class AuroraPlusApplication {
    public static void main(String[] args) {
        SpringApplication.run(AuroraPlusApplication.class, args);
    }
}
