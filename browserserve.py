# encoding: utf-8
"""Use instead of `python3 -m http.server` when you need CORS"""

from http.server import HTTPServer, SimpleHTTPRequestHandler
from selenium import webdriver
from selenium.common.exceptions import WebDriverException
import socketserver
import threading
import os
import sys
import getopt

class CORSRequestHandler(SimpleHTTPRequestHandler):
	""" Simple CORS request handler inherits simple http 
	and overrides the header to add access control
	directives to allow browser to access local 
	files.
	"""	
	def end_headers(self):
		self.send_header('Access-Control-Allow-Origin', '*')
		self.send_header('Access-Control-Allow-Methods', 'GET')
		self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
		return super(CORSRequestHandler, self).end_headers()
	
class ThreadedHTTPServer(object):
	""" A threaded simple http server which uses
	a custom CORS request handler to allow a web browser
	to access local files.
	"""
	handler = CORSRequestHandler
	def __init__(self, host, port):
		self.server = socketserver.TCPServer((host, port), self.handler)
		# NOTE: this thread will run until killed.
		self.server_thread = threading.Thread(target=self.server.serve_forever)
		self.server_thread.daemon = True

	def start(self):
		self.server_thread.start()

	def stop(self):
		self.server.shutdown()
		self.server.server_close()


def run_server(argv):
	# Take input file (index.html typically) to host.
	
	input_file = ''
	try:
		opts, args = getopt.getopt(argv,"i:h",["ifile=","help="])
	except getopt.GetoptError:
		print('serve_local.py -i <path to web file to host> -h <print help>')
		sys.exit(2)
		
	for opt, arg in opts:
		if opt == '-h':
			print('serve_local.py -i <path to web file to host> -h <print help>')
			sys.exit()
		elif opt in ("-i", "--ifile"):
			input_file = arg.strip()	
	
	
	# validate directory passed in by user
	_dir = os.path.dirname(input_file)
	
	# see if file passed is valid relative filepath
	if not _dir:
		if input_file in os.listdir('.'):
			# if the file is here, format the windows dbl backslash to fwdslash
			_dir = os.getcwd().replace('\\', '/')
			# make filename absolute path
			input_file = os.path.join(_dir, input_file)
	
	# check that format of dir went well
	if not os.path.isdir(_dir):
		raise IOError(f"Could not find directory: {_dir}. Exiting.")
		sys.exit(2)
	
	# Validate input file and get explicit system path
	try:
		with open(input_file, 'r') as inf:
			pass
	except IOError:
		print("Looks like I can't open that file.  Please make sure it is not open somewhere and you have sufficient permissions to read the file")
		sys.exit(2)
	
	# format filename for browsing
	_full_filename = "file://" + input_file.strip()
	
	
	# run hostname:localhost on port 8003
	httpd = ThreadedHTTPServer('localhost', 8003)
	# start pops open a thread and runs forever.
	httpd.start()
	print("Starting server on localhost.  Press Ctrl + C to quit...")
	
	# TODO detect default browser and find compatible installed driver for selenium.
	# for now, use Firefox.  Can chage this to any other webdriver installed with selenium.
	driver = webdriver.Firefox()
	driver.maximize_window()
	driver.get(_full_filename)
	
	
	"""
		Catch common exceptions or terminated sessions and exit with grace.
		Will handle Ctrl+C on command line or closing the browser window
	"""
	try:
		while driver.current_window_handle not in ('', None):
			pass
	except KeyboardInterrupt:
		print("got keyboard interrupt...")
	except WebDriverException:
		print("browser closed..." )
	finally:
		httpd.stop()
		
	
if __name__ == '__main__':
	
	run_server(sys.argv[1:])	