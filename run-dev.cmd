@echo off
set "JAVA_HOME=C:\Program Files\JetBrains\IntelliJ IDEA 2026.2.1\jbr"
set "MAVEN_HOME=C:\Users\Windows\.m2\wrapper\dists\apache-maven-3.9.16\0daed3be3ebd1c706f0e69e8b07c6b73f5cc4ea3dfce72a8d0ec2e849ca2ddb0"
set "PATH=%MAVEN_HOME%\bin;%JAVA_HOME%\bin;%PATH%"
cd /d "%~dp0"
mvn spring-boot:run
